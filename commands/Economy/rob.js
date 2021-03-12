const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const moment = require('moment');

module.exports = class BalanceCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'rob',
      description: 'Rob a player',
      category: 'Economy',
      usage: 'rob <user>',
      aliases: ['robbery'],
      guildOnly: true
    });
  }

  run (msg, text) {
    const p = msg.settings.prefix;
    let mem;

    const type = 'rob';

    const cooldown = db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`) || 600; // get cooldown from database or set to 600 seconds (10 minutes)
    let userCooldown = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`) || {};

    if (userCooldown.active) {
      const timeleft = userCooldown.time - Date.now();
      if (timeleft < 0 || timeleft > (cooldown * 1000)) {
        userCooldown = {};
        userCooldown.active = false;
        db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
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
      mem = getMember(msg, text.join(' '));
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

    const authCash = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
    const authBank = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`) || 0;
    const authNet = authCash + authBank;

    const memCash = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;

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
      failRate = (authNet / (memCash + authNet)) * 100;
    }
    const ranNum = Math.random() * 100;
    const fineAmnt = Math.floor(Math.random() * authNet);
    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (failRate > 100) {
      const em = new DiscordJS.MessageEmbed()
        .setColor('ORANGE')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription('You have too much money to rob someone.');
      return msg.channel.send(em);
    }
    if (ranNum < failRate) {
      db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, fineAmnt);

      const em = new DiscordJS.MessageEmbed()
        .setColor('RED')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`You were caught attempting to rob ${mem.displayName} and have been fined ${cs + fineAmnt.toLocaleString()}`);
      msg.channel.send(em);
    } else {
      // Lucky then, give them the money!
      const amnt = Math.floor(Math.random() * memCash) + 1;

      db.subtract(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amnt);
      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, amnt);

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#0099CC')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`You succesfully robbed ${mem} of ${cs}${amnt.toLocaleString()}`)
        .addField('Your New Balance', `${cs}${db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`).toLocaleString()}`, false)
        .addField(`${mem.displayName}'s New Balance`, `${cs}${db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`).toLocaleString()}`, false);
      msg.channel.send(embed);
    }

    userCooldown.time = Date.now() + (cooldown * 1000);
    userCooldown.active = true;
    db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);

    setTimeout(() => {
      userCooldown = {};
      userCooldown.active = false;
      db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.${type}.cooldown`, userCooldown);
    }, cooldown * 1000);
  }
};
