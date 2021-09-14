// This event executes when a new member joins a server. Let's welcome them!
const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (member) {
    (async () => {
      const logChan = db.get(`servers.${member.guild.id}.logs.channel`);
      if (!logChan) return;

      const logSys = db.get(`servers.${member.guild.id}.logs.log_system.member-join`);
      if (logSys !== 'enabled') return;

      const logChannel = member.guild.channels.cache.get(logChan);
      if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

      const embed = new DiscordJS.MessageEmbed();
      await member.guild.members.fetch();
      embed.setTitle('Member Joined');
      embed.setColor('#3dd0f4');
      embed.setAuthor(member.user.tag, member.user.displayAvatarURL());
      embed.setThumbnail(member.user.displayAvatarURL());
      embed.addField('User', member.toString(), true);
      embed.addField('Member Count', member.guild.members.cache.size.toLocaleString(), true);
      embed.setFooter(`ID: ${member.user.id}`);
      embed.setTimestamp();
      member.guild.channels.cache.get(logChan).send({ embeds: [embed] });
      db.add(`servers.${member.guild.id}.logs.member-join`, 1);
      db.add(`servers.${member.guild.id}.logs.all`, 1);
    })();

    (async () => {
      const toggle = db.get(`servers.${member.guild.id}.proles.system`) || false;
      if (!toggle) return;

      if (!member.guild.me.permissions.has('MANAGE_ROLES')) return;
      if (member.user.bot) return;

      const roles = db.get(`servers.${member.guild.id}.proles.users.${member.id}`);
      if (!roles) return;

      for (let i = 0; i < roles.length; i++) {
        member.roles.add(roles[i]).catch(console.error);
        await require('util').promisify(setTimeout)(1000);
      }

      db.delete(`servers.${member.guild.id}.proles.users.${member.id}`);
    })();

    // Load the guild's settings
    const settings = this.client.getSettings(member.guild);

    // If welcome is off, don't proceed (don't welcome the user)
    if (settings.welcomeEnabled !== 'true') return;

    // Replace the placeholders in the welcome message with actual data
    const welcomeMessage = settings.welcomeMessage.replace('{{user}}', member.user.tag).replace('{{guild}}', member.guild.name);

    const em = new DiscordJS.MessageEmbed()
      .setColor('RANDOM')
      .setTitle(`Welcome to ${member.guild.name}`)
      .setAuthor(member.user.tag, member.user.displayAvatarURL())
      .setDescription(welcomeMessage)
      .setTimestamp();

    member.guild.channels.cache.find(c => c.name === settings.welcomeChannel).send({ embeds: [em] });
  }
};
