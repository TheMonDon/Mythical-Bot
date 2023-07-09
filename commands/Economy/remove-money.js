const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class RemoveMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'remove-money',
      category: 'Economy',
      description:
        "Remove money from a users's cash or bank balance. \nIf the cash or bank argument isn't given, it will be added to the cash part.",
      usage: 'remove-money [cash | bank] <member> <amount>',
      aliases: ['removemoney', 'removebal'],
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}remove-money [cash | bank] <member> <amount>`;

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    if (!msg.member.permissions.has('ManageGuild')) {
      embed.setDescription('You are missing the **Manage Guild** permission.');
      return msg.channel.send({ embeds: [embed] });
    }

    let type = 'cash';
    let mem;
    let amount;

    if (!args || args.length < 2) {
      embed.setDescription(usage);
      return msg.channel.send({ embeds: [embed] });
    }

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (args.length === 2) {
      mem = await this.client.util.getMember(msg, args[0]);
      amount = parseFloat(args[1].replace(currencySymbol, '').replace(/,/gi, ''));
    } else {
      mem = await this.client.util.getMember(msg, args[1]);
      amount = parseFloat(args[2].replace(currencySymbol, '').replace(/,/gi, ''));
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount)) {
      embed.setDescription(usage);
      return msg.channel.send({ embeds: [embed] });
    }

    if (!mem) {
      embed.setDescription(stripIndents`
      :x: Invalid member given.

      Usage: ${msg.settings.prefix}remove-money <cash | bank> <member> <amount>
      `);
      return msg.channel.send({ embeds: [embed] });
    }

    if (mem.user.bot) {
      embed.setDescription("You can't add money to bots.");
      return msg.channel.send({ embeds: [embed] });
    }

    if (type === 'bank') {
      db.subtract(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, amount);
    } else {
      const cash =
        db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) ||
        db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
        0;
      const newAmount = cash - amount;
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount);
    }

    embed
      .setColor(msg.settings.embedColor)
      .setDescription(
        `:white_check_mark: Removed **${currencySymbol}${amount.toLocaleString()}** from ${mem}'s ${type} balance.`,
      )
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RemoveMoney;
