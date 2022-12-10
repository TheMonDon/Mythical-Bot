const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class Blacklist extends Command {
  constructor (client) {
    super(client, {
      name: 'blacklist',
      description: 'Blacklist someone from using the bot',
      usage: 'Blacklist <Add | Remove | Check> <User> <Reason>',
      category: 'Moderator',
      permLevel: 'Moderator',
      aliases: ['bl'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    let mem;
    let type;
    const usage = `Incorrect Usage:${msg.settings.prefix}Blacklist <Add | Remove | Check> <User> <Reason>`;

    if (!text || text.length < 1) {
      return msg.reply(usage);
    } else if (text[0] && text[1]) {
      if (!['add', 'remove', 'check'].includes(text[0].toLowerCase())) {
        return msg.reply(usage);
      } else {
        type = text[0].toLowerCase();
      }
    } else if (text[0]) {
      mem = await getMember(msg, text[0]);
      type = 'check';

      if (!mem) return msg.reply(usage);
    }

    if (!mem && text[1]) {
      mem = await getMember(msg, text[1]);

      if (!mem) return msg.reply(`${usage} \nPlease provide a valid server member.`);
    }

    text.shift();
    text.shift();
    const reason = text.join(' ') || false;

    const blacklist = db.get(`servers.${msg.guild.id}.users.${mem.id}.blacklist`);
    if (type === 'add') { // Add member to blacklist
      if (blacklist) {
        return msg.channel.send('That user is already blacklisted.');
      }
      if (!reason) return msg.channel.send(`${usage} \nPlease provide a valid reason.`);

      db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklist`, true);
      db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`, reason);

      const em = new EmbedBuilder()
        .setTitle(`${mem.user.tag} has been added to the blacklist.`)
        .setColor('#0099CC')
        .addFields([
          { name: 'Reason:', value: reason },
          { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
          { name: 'Server:', value: `${msg.guild.name} \n(${msg.guild.id})` }
        ])
        .setTimestamp();
      msg.channel.send({ embeds: [em] });
      mem.send({ embeds: [em] });
    } else if (type === 'remove') { // remove member from blacklist
      if (!blacklist) return msg.channel.send('That user is not blacklisted');
      if (!reason) return msg.channel.send(`${usage} \nPlease provide a valid reason.`);

      db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklist`, false);
      db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`, reason);

      const em = new EmbedBuilder()
        .setTitle(`${mem.user.tag} has been removed to the blacklist.`)
        .setColor('#0099CC')
        .addFields([
          { name: 'Reason:', value: reason },
          { name: 'Member:', value: `${mem.displayName} \n(${mem.id})` },
          { name: 'Server:', value: `${msg.guild.name} \n(${msg.guild.id})` }
        ])
        .setTimestamp();
      msg.channel.send({ embeds: [em] });
      mem.send({ embeds: [em] });
    } else if (type === 'check') { // check if member is blacklisted
      const reason = db.get(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`) || false;

      const bl = blacklist ? 'is' : 'is not';
      const em = new EmbedBuilder()
        .setTitle(`${mem.user.tag} blacklist check`)
        .setColor('#0099CC')
        .addFields([
          { name: 'Member:', value: `${mem.user.tag} (${mem.id})`, inline: true },
          { name: 'Is Blacklisted?', value: `That user ${bl} blacklisted.` }
        ])
        .setTimestamp();
      if (reason) em.addFields([{ name: 'reason', value: reason, inline: true }]);

      return msg.channel.send({ embeds: [em] });
    }
  }
}

module.exports = Blacklist;
