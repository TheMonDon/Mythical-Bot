const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

class AddMoney extends Command {
  constructor (client) {
    super(client, {
      name: 'add-money',
      category: 'Economy',
      description: 'Add money to a member\'s cash or bank balance. \nIf the cash or bank argument isn\'t given, it will be added to the cash part.',
      usage: 'add-money <cash | bank> <member> <amount>',
      aliases: ['addmoney', 'addbal'],
      guildOnly: true
    });
  }

  run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}add-money <cash | bank> <member> <amount>`;

    const errEmbed = new DiscordJS.MessageEmbed()
      .setColor('#EC5454')
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL());

    if (!msg.member.permissions.has('MANAGE_GUILD')) {
      errEmbed.setDescription('You are missing the **Manage Guild** permission.');
      return msg.channel.send({ embeds: [errEmbed] });
    }

    let type = 'cash';
    let mem;
    let amount;

    if (!args || args.length < 2) {
      errEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (args.length === 2) {
      mem = getMember(msg, args[0]);
      amount = parseInt(args[1].replace(cs, '').replace(/,/g, ''), 10);
    } else {
      mem = getMember(msg, args[1]);
      amount = parseInt(args[2].replace(cs, '').replace(/,/g, ''), 10);
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount) || amount === Infinity) {
      errEmbed.setDescription(usage);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    if (!mem) {
      errEmbed.setDescription(stripIndents`
      :x: Invalid member given.

      Usage: ${msg.settings.prefix}add-money <cash | bank> <member> <amount>
      `);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    if (mem.user.bot) {
      errEmbed.setDescription('You can\'t add money to a bot.');
      return msg.channel.send({ embeds: [errEmbed] });
    }

    if (type === 'bank') {
      db.add(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, amount);
    } else {
      const cash = db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
      const newAmount = cash + amount;
      if (isNaN(newAmount) || newAmount === Infinity) {
        errEmbed.setDescription(`${mem}'s balance would be Infinity if you gave them that much!`);
        return msg.channel.send({ embeds: [errEmbed] });
      }
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount);
    }

    const embed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .setColor('#0099CC')
      .setDescription(`:white_check_mark: Added **${cs}${amount.toLocaleString()}** to ${mem}'s ${type} balance.`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = AddMoney;
