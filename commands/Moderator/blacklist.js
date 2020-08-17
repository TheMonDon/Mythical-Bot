const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class blacklist extends Command {
  constructor (client) {
    super(client, {
      name: 'blacklist',
      description: 'Blacklist someone from using the bot',
      usage: 'blacklist <add | remove | check> <user> [reason]',
      category: 'Moderator',
      aliases: ['bl'],
      guildOnly: true,
      permLevel: 'Moderator'
    });
  }

  async run (msg, text) {
    // this should be working fine. I think...
    let mem;
    let type;
    const server = msg.guild;

    if (!(db.get(`servers.${server.id}.premium`) || false)) return msg.channel.send('Sorry, this is a beta command and requires the server to have premium status. \nContact TheMonDon#1721 for premium.');

    const usage = `${msg.settings.prefix}blacklist <add | remove | check> <user> [reason]`;

    if (!text || text.length < 1) {
      return msg.channel.send(`Incorrect Usage: ${usage}`);
    } else if (text[0] && text[1]) {
      if (!['add', 'remove', 'check'].includes(text[0].toLowerCase())) {
        return msg.channel.send(`Incorrect Usage: ${usage}`);
      } else {
        type = text[0].toLowerCase();
      }
    } else if (text[0]) {
      mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text[0]}`) ||
  server.members.cache.find(m => m.displayName.toUpperCase() === `${text[0].toUpperCase()}`) ||
  server.members.cache.find(m => m.user.username.toUpperCase() === `${text[0].toUpperCase()}`) ||
  server.members.cache.find(m => m.user.username.toLowerCase().includes(`${text[0].toLowerCase()}`)) ||
  server.members.cache.find(m => m.user.tag === `${text[0]}`);

      type = 'check';

      if (!mem) return msg.channel.send(`Incorrect Usage: ${usage}`);
    }

    if (!mem && text[1]) {
      mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text[1]}`) ||
    server.members.cache.find(m => m.displayName.toUpperCase() === `${text[1].toUpperCase()}`) ||
    server.members.cache.find(m => m.user.username.toUpperCase() === `${text[1].toUpperCase()}`) ||
    server.members.cache.find(m => m.user.username.toLowerCase().includes(`${text[1].toLowerCase()}`)) ||
    server.members.cache.find(m => m.user.tag === `${text[1]}`);

      if (!mem) return msg.channel.send(`Incorrect Usage: ${usage} \nPlease provide a valid server member.`);
    }

    text.shift();
    text.shift();
    const reason = text.join(' ') || false;

    const blacklist = db.get(`servers.${server.id}.users.${mem.id}.blacklist`);
    if (type === 'add') { // Add member to blacklist
      if (blacklist) {
        return msg.channel.send('That user is already blacklisted.');
      }
      if (!reason) return msg.channel.send(`Incorrect Usage: ${usage}`);

      db.set(`servers.${server.id}.users.${mem.id}.blacklist`, true);
      db.set(`servers.${server.id}.users.${mem.id}.blacklistReason`, reason);

      const em = new DiscordJS.MessageEmbed()
        .setTitle(`${mem.user.tag} has been added to the blacklist.`)
        .setColor('#0099CC')
        .addField('Reason:', reason, true)
        .addField('Member:', `${mem.displayName} \n(${mem.id})`, true)
        .addField('Server:', `${server.name} \n(${server.id})`, true)
        .setTimestamp();
      msg.channel.send(em);
      mem.send(em);
    } else if (type === 'remove') { // remove member from blacklist
      if (!blacklist) {
        return msg.channel.send('That user is not blacklisted');
      }
      if (!reason) return msg.channel.send(`Incorrect Usage: ${usage}`);

      db.set(`servers.${server.id}.users.${mem.id}.blacklist`, false);
      db.set(`servers.${server.id}.users.${mem.id}.blacklistReason`, reason);

      const em = new DiscordJS.MessageEmbed()
        .setTitle(`${mem.user.tag} has been removed to the blacklist.`)
        .setColor('#0099CC')
        .addField('Reason:', reason, true)
        .addField('Member:', `${mem.displayName} \n(${mem.id})`, true)
        .addField('Server:', `${server.name} \n(${server.id})`, true)
        .setTimestamp();
      msg.channel.send(em);
      mem.send(em);
    } else if (type === 'check') { // check if member is blacklisted
      const reason = db.get(`servers.${server.id}.users.${mem.id}.blacklistReason`) || false;
      let bl;
      if (!blacklist) { bl = 'is not'; } else { bl = 'is'; }
      const em = new DiscordJS.MessageEmbed();
      em.setTitle(`${mem.user.tag} blacklist check`);
      em.setColor('#0099CC');
      em.addField('Member:', `${mem.user.tag} (${mem.id})`, true);
      em.addField('Is Blacklisted?', `That user ${bl} blacklisted.`);
      if (reason) { em.addField('reason', reason, true); }
      em.setTimestamp();
      return msg.channel.send(em);
    } else { // send error
      return msg.channel.send('Sorry something went wrong, please try again later.');
    }
  }
}

module.exports = blacklist;
