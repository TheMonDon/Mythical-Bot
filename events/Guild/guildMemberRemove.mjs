import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, member) {
  async function LogSystem(member) {
    const logChan = await db.get(`servers.${member.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${member.guild.id}.logs.logSystem.member-leave`);
    if (!logSys || logSys !== 'enabled') return;

    await member.guild.members.fetch();
    const memberName = member.user.discriminator === '0' ? member.user.username : member.user.tag;
    const embed = new EmbedBuilder()
      .setTitle('Member Left')
      .setColor('#3dd0f4')
      .setAuthor({ name: memberName, iconURL: member.user.displayAvatarURL() })
      .setThumbnail(member.user.displayAvatarURL())
      .addFields([
        { name: 'User', value: member.toString() },
        { name: 'Member Count', value: member.guild.members.cache.size.toLocaleString() },
      ])
      .setFooter({ text: `ID: ${member.user.id}` })
      .setTimestamp();

    const channel = member.guild.channels.cache.get(logChan);
    if (!channel) return;
    channel.send({ embeds: [embed] });

    await db.add(`servers.${member.guild.id}.logs.member-leave`, 1);
    await db.add(`servers.${member.guild.id}.logs.all`, 1);
  }

  async function AutoRole(member) {
    const toggle = (await db.get(`servers.${member.guild.id}.proles.system`)) || false;
    if (!toggle) return;

    if (!member.guild.members.me.permissions.has('ManageRoles')) return;
    if (member.user.bot) return;

    const roles = [...member.roles?.cache.values()];
    if (roles.length === 1) return;
    const arr = [];

    roles.forEach((role) => {
      if (role.id !== member.guild.id) arr.push(role.id);
    });

    await db.set(`servers.${member.guild.id}.proles.users.${member.id}`, arr);
  }

  function WelcomeMessage(client, member) {
    const settings = client.getSettings(member.guild);

    if (settings.leaveEnabled !== 'true') return;

    // Replace the placeholders in the welcome message with actual data
    const memberName = member.user.discriminator === '0' ? member.user.username : member.user.tag;
    const leaveMessage = settings.leaveMessage.replace('{{user}}', memberName).replace('{{guild}}', member.guild.name);

    const em = new EmbedBuilder()
      .setColor(settings.embedColor)
      .setTitle('Member left')
      .setAuthor({ name: memberName, iconURL: member.user.displayAvatarURL() })
      .setDescription(leaveMessage)
      .setTimestamp();

    const channel = member.guild.channels.cache.find((c) => c.name === settings.leaveChannel);
    if (!channel) return;
    channel.send({ embeds: [em] }).catch(() => {});
  }

  // Run the functions
  LogSystem(member);
  AutoRole(member);
  WelcomeMessage(client, member);
}
