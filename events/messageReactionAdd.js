import { get, set, push } from 'quick.db';
import { MessageEmbed } from 'discord.js';
import { stripIndents } from 'common-tags';
import { getTickets } from '../../base/Util.js';

export default class {
  constructor(client) {
    this.client = client;
  }

  async run(messageReaction, user) {
    if (user.bot) return;
    if (!messageReaction) return;
    const msg = messageReaction.message;

    if (get(`servers.${msg.guild.id}.tickets`)) {
      const p = this.client.settings.get(msg.guild.id).prefix;
      const { catID, logID, roleID, reactionID } = get(`servers.${msg.guild.id}.tickets`);
      if (!reactionID) return;
      if (reactionID !== msg.id) return;

      if (!msg.guild.me.permissions.has('MANAGE_CHANNELS')) return msg.channel.send('The bot is missing Manage Channels permission.');
      if (!msg.guild.me.permissions.has('MANAGE_ROLES')) return msg.channel.send('The bot is missing Manage Roles perm');
      if (!msg.guild.me.permissions.has('MANAGE_MESSAGES')) return msg.channel.send('The bot is missing Manage Messages perm');

      if (messageReaction._emoji.name !== '📰') return;
      const member = await msg.guild.members.fetch(user.id);
      messageReaction.users.remove(user.id);

      const tix = getTickets(msg.author.id, msg);
      if (tix.length > 2) {
        return msg.author.send(`Sorry ${msg.author}, you already have three or more tickets open in ${msg.guild.name}. Please close one before making a new one.`);
      }

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

      const reason = `Ticket has been created from the reaction menu. Use \`${p}topic\` to change it.`;
      const count = get(`servers.${msg.guild.id}.tickets.count`) || 0;
      set(`servers.${msg.guild.id}.tickets.count`, count + 1);

      let str = member.displayName;
      str = str.replace(/[^a-zA-Z\d:]/g, '');
      if (str.length === 0) {
        str = member.user.username.replace(/[^a-zA-Z\d:]/g, '');
        if (str.length === 0) {
          str = (Math.random().toString(36) + '00000000000000000').slice(2, 5);
        }
      }

      str = str.toLowerCase();
      const tName = `ticket-${str}-${count}`;
      const tixChan = await msg.guild.channels.create(tName, { type: 'text', parent: catID, permissionOverwrites: perms, topic: reason });

      set(`servers.${msg.guild.id}.tickets.${tName}.owner`, member.id);

      const logEmbed = new MessageEmbed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setTitle('New Ticket Created')
        .addField('Author', `${member} (${member.id})`, false)
        .addField('Channel', `${tixChan} \n(${tName}: ${tixChan.id})`, false)
        .addField('Reason', reason, false)
        .setColor('#E65DF4')
        .setTimestamp();
      const logChan = msg.guild.channels.cache.get(logID);
      await logChan.send(logEmbed);

      const chanEmbed = new MessageEmbed()
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
          tixChan.send(role, chanEmbed);
        }
      } else {
        tixChan.send(role, chanEmbed);
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

      push(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`, output);
    }
  }
};