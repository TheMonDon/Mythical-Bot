const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const moment = require('moment');

module.exports = class BalanceCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'rob',
      description: 'Rob a player',
      category: 'Economy',
      examples: ['rob <user>'],
      aliases: ['robbery'],
      guildOnly: true
    });    
  }

  run (msg, args) {
    const member = msg.member;
    const server = msg.guild;
    const text = args;
    let mem;
    const p =  msg.settings.prefix;

    const type = 'rob';

    const cooldown = db.get(`servers.${server.id}.economy.${type}.cooldown`) || 600; // get cooldown from database or set to 600 seconds (10 minutes)
    let userCooldown = db.get(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`) || {};

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > (cooldown * 1000)) {
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);
      } else {
        const tLeft = moment.duration(timeleft)
          .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#EC5454')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(`You cannot rob for ${tLeft}`);
        return msg.channel.send(embed);
      }
    }

    if (!text || text.length < 1) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`Incorrect Usage: ${p}Rob <user>`);
      return msg.channel.send(embed);
    } else {
      mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text.join(' ')}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text.join(' ').toLowerCase()}`)) || server.members.cache.find(m => m.user.tag === `${text[0]}`);
    }
  
    if (!mem) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`That user was not found. \nUsage: ${p}Rob <user>`);
      return msg.channel.send(embed);
    } else if (mem.id === msg.author.id) {
      const embed = new DiscordJS.RichEmebd()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription('You can\'t rob yoursself.');
      return msg.channel.send(embed);
    }

    const authCash = db.get(`servers.${server.id}.users.${member.id}.economy.cash`) || 0;
    const authBank = db.get(`servers.${server.id}.users.${member.id}.economy.bank`) || 0;
    const authNet = authCash + authBank;

    const memCash = db.get(`servers.${server.id}.users.${mem.id}.economy.cash`) || 0;

    if (memCash <= 0) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`${mem} does not have anything to rob.`);
      return msg.channel.send(embed);
    }

    let failRate;
    if (authNet === Number.MAX_VALUE || authNet === Infinity) {
      failRate = 101;
    } else if ((memCash + authNet) === Number.MAX_VALUE || (memCash + authNet) === Infinity) {
      failRate = 101;
    } else {
      failRate = authNet / (memCash + authNet);
    }
    const ranNum = Math.random() * 100;

    if (ranNum < failRate) {
      return msg.channel.send(`You were caught attempting to rob ${mem.displayName} and have been fined <amount coming soon>`);
    }
    if (failRate > 100) {
      return msg.channel.send(`You were caught attempting to rob ${mem.displayName} and have been fined <amount coming soon>`);
    }

    const amnt = Math.floor(Math.random() * memCash) + 1;
    const cs = db.get(`servers.${server.id}.economy.symbol`) || '$';

    db.subtract(`servers.${server.id}.users.${mem.id}.economy.cash`, amnt);
    db.add(`servers.${server.id}.users.${member.id}.economy.cash`, amnt);

    const embed = new DiscordJS.MessageEmbed()
      .setColor('#04ACF4')
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setDescription(`You succesfully robbed ${mem} of ${cs}${amnt.toLocaleString()}`)
      .addField('Your New Balance', `${cs}${db.get(`servers.${server.id}.users.${member.id}.economy.cash`).toLocaleString()}`, false)
      .addField(`${mem.displayName}'s New Balance`, `${cs}${db.get(`servers.${server.id}.users.${mem.id}.economy.cash`).toLocaleString()}`, false);
    msg.channel.send(embed);

    userCooldown.time = Date.now() + (cooldown * 1000);
    userCooldown.active = true;
    db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);

    setTimeout(() => {
      userCooldown = {};
      userCooldown.active = false;
      db.set(`servers.${server.id}.users.${member.id}.economy.${type}.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
};