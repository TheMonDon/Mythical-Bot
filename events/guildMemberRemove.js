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

      const logSys = db.get(`servers.${member.guild.id}.logs.log_system.member-leave`);
      if (logSys !== 'enabled') return;

      const logChannel = member.guild.channels.cache.get(logChan);
      if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

      const embed = new DiscordJS.MessageEmbed();
      await member.guild.members.fetch();
      embed.setTitle('Member Left');
      embed.setColor('#3dd0f4');
      embed.setAuthor(member.user.tag, member.user.displayAvatarURL());
      embed.setThumbnail(member.user.displayAvatarURL());
      embed.addField('User', member, true);
      embed.addField('Member Count', member.guild.members.cache.size, true);
      embed.setFooter(`ID: ${member.user.id}`);
      embed.setTimestamp();
      member.guild.channels.cache.get(logChan).send(embed);
      db.add(`servers.${member.guild.id}.logs.member-leave`, 1);
      db.add(`servers.${member.guild.id}.logs.all`, 1);
    })();

    // Load the guild's settings
    const settings = this.client.getSettings(member.guild);
  
    // If welcome is off, don't proceed (don't welcome the user)
    if (settings.leaveEnabled !== 'true') return;

    // Return always because this isn't set up at all yet.
    if (member === member) return;

    // Replace the placeholders in the welcome message with actual data
    const welcomeMessage = settings.welcomeMessage.replace('{{user}}', member.user.tag);

    // Send the welcome message to the welcome channel
    // There's a place for more configs here.
    member.guild.channels.cache.find(c => c.name === settings.welcomeChannel).send(welcomeMessage).catch(console.error);
  }
};
