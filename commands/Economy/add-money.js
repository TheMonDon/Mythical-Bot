const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

module.exports = class addMoney extends Command {
  constructor (client) {
    super(client, {
      name: 'add-money',
      category: 'Economy',
      description: 'Add money to a member\'s cash or bank balance.',
      usage: 'add-money <cash | bank> <member> <amount>',
      aliases: ['addmoney', 'addbal'],
      guildOnly: true
    });
  }

  run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}add-money <cash | bank> <member> <amount>`;

    let type = 'cash';
    let mem;
    let amount;

    if (!args || args.length < 2) {
      return msg.channel.send(usage);
    }

    if (args.length === 2) {
      mem = getMember(msg, args[0]);
      amount = parseInt(args[1]);
    } else {
      mem = getMember(msg, args[1]);
      amount = parseInt(args[2]);
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount)) return msg.channel.send(usage);

    if (!mem) {
      const embed = new DiscordJS.MessageEmbed()
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setColor('RED')
        .setDescription(stripIndents`
      :x: Invalid member given.

      Usage: ${msg.settings.prefix}add-money <cash | bank> <member> <amount>
      `);
      return msg.channel.send(embed);
    }

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (type === 'bank') {
      db.add(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, amount);
    } else {
      const cash = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
      const newAmount = cash + amount;
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount);
    }

    const embed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .setColor('#0099CC')
      .setDescription(`:white_check_mark: Added **${cs}${amount.toLocaleString()}** to ${mem}'s ${type} balance.`)
      .setTimestamp();
    return msg.channel.send(embed);
  }
};
