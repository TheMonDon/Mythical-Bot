const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

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
      if (!logChannel.permissionsFor(this.client.user.id).has('SendMessages')) return;

      await member.guild.members.fetch();
      const embed = new EmbedBuilder()
        .setTitle('Member Left')
        .setColor('#3dd0f4')
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
        .setThumbnail(member.user.displayAvatarURL())
        .addFields([
          { name: 'User', value: member.toString() },
          { name: 'Member Count', value: member.guild.members.cache.size.toLocaleString() }
        ])
        .setFooter({ text: `ID: ${member.user.id}` })
        .setTimestamp();
      member.guild.channels.cache.get(logChan).send({ embeds: [embed] });
      db.add(`servers.${member.guild.id}.logs.member-leave`, 1);
      db.add(`servers.${member.guild.id}.logs.all`, 1);
    })();

    (async () => {
      const toggle = db.get(`servers.${member.guild.id}.proles.system`) || false;
      if (!toggle) return;

      if (!member.guild.members.me.permissions.has('ManageRoles')) return;
      if (member.user.bot) return;

      const roles = [...member.roles?.cache.values()];
      if (roles.length === 1) return;
      const arr = [];

      roles.forEach(role => {
        if (role.id !== member.guild.id) arr.push(role.id);
      });

      db.set(`servers.${member.guild.id}.proles.users.${member.id}`, arr);
    })();

    const settings = this.client.getSettings(member.guild);

    if (settings.leaveEnabled !== 'true') return;

    // Replace the placeholders in the welcome message with actual data
    const leaveMessage = settings.leaveMessage.replace('{{user}}', member.user.tag).replace('{{guild}}', member.guild.name);

    const em = new EmbedBuilder()
      .setName('Member Left')
      .setColor('#0099CC')
      .setTitle('Goodbye')
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setDescription(leaveMessage)
      .setTimestamp();

    member.guild.channels.cache.find(c => c.name === settings.leaveChannel).send({ embeds: [em] });
  }
};
