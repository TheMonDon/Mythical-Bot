const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (messageReaction, user) {
    if (user.bot) return;
    if (!messageReaction) return;
    const msg = messageReaction.message;

    if (db.get(`servers.${msg.guild.id}.tickets`)) {
      const { catID, logID, roleID, reactionID } = db.get(`servers.${msg.guild.id}.tickets`);
      if (!reactionID) return;

      if (reactionID !== msg.id) return;

      if (!msg.guild.me.permissions.has('MANAGE_CHANNELS')) return msg.channel.send('The bot is missing manage channels perm.');
      if (!msg.guild.me.permissions.has('MANAGE_ROLES')) return msg.channel.send('The bot is missing manage roles perm');
      if (!msg.guild.me.permissions.has('MANAGE_MESSAGES')) return msg.channel.send('The bot is missing manage messages perm');

      if (messageReaction._emoji.name !== '📰') return;
      const member = await msg.guild.members.fetch(user.id);
      messageReaction.users.remove(user.id);

      const perms = [{
        id: msg.member.id,
        allow: ['VIEW_CHANNEL']
      },
      {
        id: msg.guild.me.id,
        allow: ['VIEW_CHANNEL']
      },
      {
        id: roleID,
        allow: ['VIEW_CHANNEL']
      },
      {
        id: msg.guild.id,
        deny: ['VIEW_CHANNEL']
      }
      ];

      const reason = 'Ticket has been created from the reaction menu. Use `topic` command to change it.';
      const count = db.get(`servers.${msg.guild.id}.tickets.count`) || 1;
      db.set(`servers.${msg.guild.id}.tickets.count`, count + 1);

      let str = member.displayName.toLowerCase();
      str = str.replace(/[^a-zA-Z\d:]/g, '');
      if (str.length === 0) {
        str = member.user.username.replace(/[^a-zA-Z\d:]/g, '');
        if (str.length === 0) {
          str = (Math.random().toString(36) + '00000000000000000').slice(2, 5);
        }
      }
      const tName = `ticket-${str}-${count}`;
      const tixChan = await msg.guild.channels.create(tName, { type: 'text', parent: catID, permissionOverwrites: perms, topic: reason });

      db.set(`servers.${msg.guild.id}.tickets.${tName}.owner`, member.id);

      const logEmbed = new DiscordJS.MessageEmbed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setTitle('New Ticket Created')
        .addField('Author', `${member} (${member.id})`, false)
        .addField('Channel', `${tixChan} \n(${tName}: ${tixChan.id})`, false)
        .addField('Reason', reason, false)
        .setColor('#E65DF4')
        .setTimestamp();
      const logChan = msg.guild.channels.cache.get(logID);
      await logChan.send({ embeds: [logEmbed] });

      const chanEmbed = new DiscordJS.MessageEmbed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setTitle(`${member.displayName}'s Ticket`)
        .addField('Reason', reason, false)
        .setDescription('Please wait patiently and our support team will be with you shortly.')
        .setColor('#E65DF4')
        .setTimestamp();
      const role = msg.guild.roles.cache.get(roleID);

      if (!role.mentionable) {
        if (!tixChan.permissionsFor(this.client.user.id).has('MENTION_EVERYONE')) {
          role.setMentionable(true);
          tixChan.send({ embeds: [chanEmbed], content: role });
        }
      } else {
        tixChan.send({ embeds: [chanEmbed], content: role });
      }

      // Logging info
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const timestamp = month + '/' + day + '/' + year + ' ' + hour + ':' + min;

      const output = stripIndents`
      Ticket created at: ${timestamp}

      Author: ${member.id} (${member.user.tag})

      Topic: ${reason}\n
      `;

      db.push(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`, output);
    }
  }
};
