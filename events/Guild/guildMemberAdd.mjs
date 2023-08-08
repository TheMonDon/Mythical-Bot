import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
import { promisify } from 'util';
const setTimeoutPromise = promisify(setTimeout);
const db = new QuickDB();

export async function run(client, member) {
  const memberName = member.user.discriminator === '0' ? member.user.username : member.user.tag;

  async function LogSystem(member) {
    const logChan = await db.get(`servers.${member.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${member.guild.id}.logs.logSystem.member-join`);
    if (!logSys || logSys !== 'enabled') return;

    await member.guild.members.fetch();
    const embed = new EmbedBuilder()
      .setTitle('Member Joined')
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

    await db.add(`servers.${member.guild.id}.logs.member-join`, 1);
    await db.add(`servers.${member.guild.id}.logs.all`, 1);
  }

  async function AutoRole(member) {
    const toggle = (await db.get(`servers.${member.guild.id}.proles.system`)) || false;
    if (!toggle) return;

    if (!member.guild.members.me.permissions.has('ManageRoles')) return;
    if (member.user.bot) return;

    const roles = await db.get(`servers.${member.guild.id}.proles.users.${member.id}`);
    if (!roles) return;

    for (let i = 0; i < roles.length; i++) {
      member.roles.add(roles[i]).catch(console.error);
      await setTimeoutPromise(1000);
    }

    await db.delete(`servers.${member.guild.id}.proles.users.${member.id}`);
  }

  function WelcomeSystem(client, member) {
    // Load the guild's settings
    const settings = client.getSettings(member.guild);

    // If welcome is off, don't proceed (don't welcome the user)
    if (settings.welcomeEnabled !== 'true') return;

    // Replace the placeholders in the welcome message with actual data

    const welcomeMessage = settings.welcomeMessage
      .replace('{{user}}', memberName)
      .replace('{{guild}}', member.guild.name);

    const embed = new EmbedBuilder()
      .setTitle('Member Joined')
      .setColor(settings.embedColor)
      .setTitle(`Welcome to ${member.guild.name}`)
      .setAuthor({ name: memberName, iconURL: member.user.displayAvatarURL() })
      .setDescription(welcomeMessage)
      .setTimestamp();

    const channel = member.guild.channels.cache.find((c) => c.name === settings.welcomeChannel);
    if (!channel) return;
    channel.send({ embeds: [embed] }).catch(() => {});
  }

  // Run the functions
  LogSystem(member);
  AutoRole(member);
  WelcomeSystem(client, member);
}
