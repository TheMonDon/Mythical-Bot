const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
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

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}add-money <cash | bank> <member> <amount>`;

    const errEmbed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (!msg.member.permissions.has('ManageGuild')) {
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

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (args.length === 2) {
      mem = await this.client.util.getMember(msg, args[0]);
      amount = parseFloat(args[1].replace(currencySymbol, '').replace(/,/g, ''));
    } else {
      mem = await this.client.util.getMember(msg, args[1]);
      amount = parseFloat(args[2].replace(currencySymbol, '').replace(/,/g, ''));
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
      const cash = parseFloat(db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0);
      const newAmount = cash + amount;
      if (isNaN(newAmount) || newAmount === Infinity) {
        errEmbed.setDescription(`${mem}'s balance would be Infinity if you gave them that much!`);
        return msg.channel.send({ embeds: [errEmbed] });
      }
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount);
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setDescription(`:white_check_mark: Added **${currencySymbol}${amount.toLocaleString()}** to ${mem}'s ${type} balance.`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = AddMoney;
