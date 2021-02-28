const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class blacklist extends Command {
  constructor(client) {
    super(client, {
      name: 'blacklist',
      description: 'Blacklist someone from using the bot',
      usage: 'blacklist <add | remove | check> <user> <reason>',
      category: 'Moderator',
      aliases: ['bl'],
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, text) {
    let mem;
    let type;
    const usage = `${msg.settings.prefix}blacklist <add | remove | check> <user> <reason>`;

    if (!text || text.length < 1) {
      return msg.channel.send(`Incorrect Usage: ${usage}`);
    } else if (text[0] && text[1]) {
      if (!['add', 'remove', 'check'].includes(text[0].toLowerCase())) {
        return msg.channel.send(`Incorrect Usage: ${usage}`);
      } else {
        type = text[0].toLowerCase();
      }
    } else if (text[0]) {
      mem = msg.mentions.members.first() || msg.guild.members.cache.find(m => m.id === `${text[0]}`) ||
        msg.guild.members.cache.find(m => m.displayName.toUpperCase() === `${text[0].toUpperCase()}`) ||
        msg.guild.members.cache.find(m => m.user.username.toUpperCase() === `${text[0].toUpperCase()}`) ||
        msg.guild.members.cache.find(m => m.user.username.toLowerCase().includes(`${text[0].toLowerCase()}`)) ||
        msg.guild.members.cache.find(m => m.user.tag === `${text[0]}`);

      type = 'check';

      if (!mem) return msg.channel.send(`Incorrect Usage: ${usage}`);
    }

    if (!mem && text[1]) {
      mem = msg.mentions.members.first() || msg.guild.members.cache.find(m => m.id === `${text[1]}`) ||
        msg.guild.members.cache.find(m => m.displayName.toUpperCase() === `${text[1].toUpperCase()}`) ||
        msg.guild.members.cache.find(m => m.user.username.toUpperCase() === `${text[1].toUpperCase()}`) ||
        msg.guild.members.cache.find(m => m.user.username.toLowerCase().includes(`${text[1].toLowerCase()}`)) ||
        msg.guild.members.cache.find(m => m.user.tag === `${text[1]}`);

      if (!mem) return msg.channel.send(`Incorrect Usage: ${usage} \nPlease provide a valid server member.`);
    }

    text.shift();
    text.shift();
    const reason = text.join(' ') || false;

    const blacklist = db.get(`servers.${msg.guild.id}.users.${mem.id}.blacklist`);
    if (type === 'add') { // Add member to blacklist
      if (blacklist) {
        return msg.channel.send('That user is already blacklisted.');
      }
      if (!reason) return msg.channel.send(`Incorrect Usage: ${usage}`);

      db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklist`, true);
      db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`, reason);

      const em = new DiscordJS.MessageEmbed()
        .setTitle(`${mem.user.tag} has been added to the blacklist.`)
        .setColor('#0099CC')
        .addField('Reason:', reason, true)
        .addField('Member:', `${mem.displayName} \n(${mem.id})`, true)
        .addField('Server:', `${msg.guild.name} \n(${msg.guild.id})`, true)
        .setTimestamp();
      msg.channel.send(em);
      mem.send(em);
    } else if (type === 'remove') { // remove member from blacklist
      if (!blacklist) return msg.channel.send('That user is not blacklisted');
      if (!reason) return msg.channel.send(`Incorrect Usage: ${usage}`);

      db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklist`, false);
      db.set(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`, reason);

      const em = new DiscordJS.MessageEmbed()
        .setTitle(`${mem.user.tag} has been removed to the blacklist.`)
        .setColor('#0099CC')
        .addField('Reason:', reason, true)
        .addField('Member:', `${mem.displayName} \n(${mem.id})`, true)
        .addField('Server:', `${msg.guild.name} \n(${msg.guild.id})`, true)
        .setTimestamp();
      msg.channel.send(em);
      mem.send(em);
    } else if (type === 'check') { // check if member is blacklisted
      const reason = db.get(`servers.${msg.guild.id}.users.${mem.id}.blacklistReason`) || false;
      /*let bl;
      if (!blacklist) { bl = 'is not'; } else { bl = 'is'; }*/

      const bl = blacklist ? bl = 'is' : bl = 'is not';
      const em = new DiscordJS.MessageEmbed()
        .setTitle(`${mem.user.tag} blacklist check`)
        .setColor('#0099CC')
        .addField('Member:', `${mem.user.tag} (${mem.id})`, true)
        .addField('Is Blacklisted?', `That user ${bl} blacklisted.`)
        .setTimestamp();
      if (reason) em.addField('reason', reason, true);

      return msg.channel.send(em);
    } else { // send error
      return msg.channel.send('Sorry something went wrong, please try again later.');
    }
  }
}

module.exports = blacklist;
