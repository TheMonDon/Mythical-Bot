import { ChannelType, EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, messageReaction, user) {
  if (user.bot) return;
  if (!messageReaction) return;
  const msg = messageReaction.message;

  if (!(await db.get(`servers.${msg.guild.id}.tickets`))) return;

  const { catID, logID, roleID, reactionID } = await db.get(`servers.${msg.guild.id}.tickets`);
  if (!reactionID) return;

  if (reactionID !== msg.id) return;

  if (!msg.guild.members.me.permissions.has('ManageChannels')) {
    return msg.channel.send('The bot is missing `Manage Channels` permission.');
  }
  if (!msg.guild.members.me.permissions.has('ManageRoles')) {
    return msg.channel.send('The bot is missing `Manage Roles` permission');
  }
  if (!msg.guild.members.me.permissions.has('ManageMessages')) {
    return msg.channel.send('The bot is missing `Manage Messages` permission');
  }

  if (messageReaction._emoji.name !== '📰') return;
  const member = await msg.guild.members.fetch(user.id);
  messageReaction.users.remove(user.id);

  const perms = [
    {
      id: user.id,
      allow: ['ViewChannel'],
    },
    {
      id: msg.guild.members.me.id,
      allow: ['ViewChannel'],
    },
    {
      id: roleID,
      allow: ['ViewChannel'],
    },
    {
      id: msg.guild.id,
      deny: ['ViewChannel'],
    },
  ];

  const reason = `Ticket has been created from the reaction menu. Use \`${
    client.getSettings(msg.guild).prefix
  }topic\` command to change it.`;

  let channelName = member.displayName.toLowerCase();
  channelName = channelName.replace(/[^a-zA-Z\d:]/g, '');
  if (channelName.length === 0) {
    channelName = member.user.username.replace(/[^a-zA-Z\d:]/g, '');
    if (channelName.length === 0) {
      channelName = (Math.random().toString(36) + '00000000000000000').slice(2, 5);
    }
  }

  const tName = `ticket-${channelName}`;
  const tixChan = await msg.guild.channels.create({
    name: tName,
    type: ChannelType.GuildText,
    parent: catID,
    permissionOverwrites: perms,
    topic: reason,
  });

  await db.set(`servers.${msg.guild.id}.tickets.${tixChan.id}.owner`, member.id);

  const logEmbed = new EmbedBuilder()
    .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
    .setTitle('New Ticket Created')
    .addFields([
      { name: 'Author', value: `${member} (${member.id})`, inline: false },
      { name: 'Channel', value: `${tixChan} \n(${tName}: ${tixChan.id})`, inline: false },
      { name: 'Reason', value: reason, inline: false },
    ])
    .setColor('#E65DF4')
    .setTimestamp();
  const logChan = msg.guild.channels.cache.get(logID);
  await logChan.send({ embeds: [logEmbed] }).catch(() => {});

  const chanEmbed = new EmbedBuilder()
    .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
    .setTitle(`${member.displayName}'s Ticket`)
    .addFields([{ name: 'Reason', value: reason, inline: false }])
    .setDescription('Please wait patiently and our support team will be with you shortly.')
    .setColor('#E65DF4')
    .setTimestamp();
  const role = msg.guild.roles.cache.get(roleID);

  if (!role.mentionable) {
    if (!tixChan.permissionsFor(client.user.id).has('MentionEveryone')) {
      await role.setMentionable(true);
      await tixChan.send({ content: role.toString(), embeds: [chanEmbed] }).catch(() => {});
      return await role.setMentionable(false);
    }
  }

  return tixChan.send({ content: role.toString(), embeds: [chanEmbed] }).catch(() => {});
}
