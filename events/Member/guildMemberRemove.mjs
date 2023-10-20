import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, member) {
  const memberName = member.user.discriminator === '0' ? member.user.username : member.user.tag;

  async function LogSystem(member) {
    const logChan = await db.get(`servers.${member.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${member.guild.id}.logs.logSystem.member-leave`);
    if (!logSys || logSys !== 'enabled') return;

    // Fetch all member so member count is correct
    await member.guild.members.fetch();
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
    channel.send({ embeds: [embed] }).catch(() => {});
  }

  async function AutoRole(client, member) {
    try {
      if (!member.guild) return;

      const toggle = (await db.get(`servers.${member.guild.id}.proles.system`)) || false;
      if (!toggle) return;

      if (!member.guild.members.me.permissions.has('ManageRoles')) return;
      if (member.user.bot) return;

      const roles = [...member.roles.cache.values()];
      if (roles.length === 1) return;
      const arr = roles.filter((role) => role.id !== member.guild.id).map((role) => role.id);

      await db.set(`servers.${member.guild.id}.proles.users.${member.user.id}`, arr);
    } catch (error) {
      client.logger.error(error);
      console.error(error);
    }
  }

  function WelcomeMessage(client, member) {
    const settings = client.getSettings(member.guild);

    if (settings.leaveEnabled !== 'true') return;

    // Replace the placeholders in the leave message with actual data
    const leaveMessage = settings.leaveMessage.replace('{{user}}', memberName).replace('{{guild}}', member.guild.name);

    const em = new EmbedBuilder()
      .setColor(settings.embedColor)
      .setTitle('Member Left')
      .setAuthor({ name: memberName, iconURL: member.user.displayAvatarURL() })
      .setDescription(leaveMessage)
      .setTimestamp();

    const channel = member.guild.channels.cache.find((c) => c.name === settings.leaveChannel);
    if (!channel) return;
    channel.send({ embeds: [em] }).catch(() => {});
  }

  // Run the functions
  await LogSystem(member);
  await AutoRole(client, member);
  WelcomeMessage(client, member);
}
