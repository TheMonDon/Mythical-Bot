const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(member) {
    const memberName = member.user.discriminator === '0' ? member.user.username : member.user.tag;

    async function LogSystem(client, member) {
      const logChan = db.get(`servers.${member.guild.id}.logs.channel`);
      if (!logChan) return;

      const logSys = db.get(`servers.${member.guild.id}.logs.logSystem.member-join`);
      if (logSys !== 'enabled') return;

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

      member.guild.channels.cache
        .get(logChan)
        .send({ embeds: [embed] })
        .catch(() => {});

      db.add(`servers.${member.guild.id}.logs.member-join`, 1);
      db.add(`servers.${member.guild.id}.logs.all`, 1);
    }

    async function AutoRole(client, member) {
      const toggle = db.get(`servers.${member.guild.id}.proles.system`) || false;
      if (!toggle) return;

      if (!member.guild.members.me.permissions.has('ManageRoles')) return;
      if (member.user.bot) return;

      const roles = db.get(`servers.${member.guild.id}.proles.users.${member.id}`);
      if (!roles) return;

      for (let i = 0; i < roles.length; i++) {
        member.roles.add(roles[i]).catch(console.error);
        await require('util').promisify(setTimeout)(1000);
      }

      db.delete(`servers.${member.guild.id}.proles.users.${member.id}`);
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

      const em = new EmbedBuilder()
        .setTitle('Member Joined')
        .setColor(settings.embedColor)
        .setTitle(`Welcome to ${member.guild.name}`)
        .setAuthor({ name: memberName, iconURL: member.user.displayAvatarURL() })
        .setDescription(welcomeMessage)
        .setTimestamp();

      member.guild.channels.cache
        .find((c) => c.name === settings.welcomeChannel)
        .send({ embeds: [em] })
        .catch(() => {});
    }

    // Run the functions
    LogSystem(this.client, member);
    AutoRole(this.client, member);
    WelcomeSystem(this.client, member);
  }
};
