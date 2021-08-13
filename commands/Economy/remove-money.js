const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

module.exports = class removeMoney extends Command {
  constructor (client) {
    super(client, {
      name: 'remove-money',
      category: 'Economy',
      description: 'Remove money from a member\'s cash or bank balance. \nIf the cash or bank argument isn\'t given, it will be added to the cash part.',
      usage: 'remove-money [cash | bank] <member> <amount>',
      aliases: ['removemoney', 'removebal'],
      guildOnly: true
    });
  }

  run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}remove-money [cash | bank] <member> <amount>`;

    const errEmbed = new DiscordJS.MessageEmbed()
      .setColor('#EC5454')
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL());

    if (!msg.member.permissions.has('MANAGE_GUILD')) {
      errEmbed.setDescription('You are missing the **Manage Guild** permission.');
      return msg.channel.send(errEmbed);
    }

    let type = 'cash';
    let mem;
    let amount;

    if (!args || args.length < 2) {
      errEmbed.setDescription(usage);
      return msg.channel.send(errEmbed);
    }

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (args.length === 2) {
      mem = getMember(msg, args[0]);
      amount = parseInt(args[1].replace(cs, '').replace(',', ''), 10);
    } else {
      mem = getMember(msg, args[1]);
      amount = parseInt(args[2].replace(cs, '').replace(',', ''), 10);
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount)) {
      errEmbed.setDescription(usage);
      return msg.channel.send(errEmbed);
    }

    if (!mem) {
      errEmbed.setDescription(stripIndents`
      :x: Invalid member given.

      Usage: ${msg.settings.prefix}remove-money <cash | bank> <member> <amount>
      `);
      return msg.channel.send(errEmbed);
    }

    if (mem.user.bot) {
      errEmbed.setDescription('You can\'t add money to bots.');
      return msg.channel.send(errEmbed);
    }

    if (type === 'bank') {
      db.subtract(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, amount);
    } else {
      const cash = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
      const newAmount = cash - amount;
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount);
    }

    const embed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setColor('#0099CC')
      .setDescription(`:white_check_mark: Removed **${cs}${amount.toLocaleString()}** to ${mem}'s ${type} balance.`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
};
