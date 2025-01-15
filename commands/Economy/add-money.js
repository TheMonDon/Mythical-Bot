const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class AddMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'add-money',
      category: 'Economy',
      description:
        "Add money to a member's cash or bank balance. \nIf the cash or bank argument isn't given, it will be added to the cash part.",
      usage: 'add-money [cash | bank] <member> <amount>',
      aliases: ['addmoney', 'addbal'],
      permLevel: 'Administrator',
      guildOnly: true,
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    let type = 'cash';
    let mem;
    let amount;

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    if (args.length === 2) {
      mem = await this.client.util.getMember(msg, args[0]);
      amount = parseInt(args[1].replace(/[^0-9].*/, '').replace(/[^0-9]/g, ''));
    } else {
      mem = await this.client.util.getMember(msg, args[1]);
      amount = parseInt(args[2].replace(/[^0-9].*/, '').replace(/[^0-9]/g, ''));
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Amount');
    }
    if (amount === Infinity) {
      return this.client.util.errorEmbed(msg, "You can't add Infinity to a member", 'Invalid Amount');
    }
    if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    if (mem.user.bot) return this.client.util.errorEmbed(msg, "You can't add money to a bot.");

    amount = BigInt(amount);
    if (type === 'bank') {
      const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`)) || 0);
      const newAmount = bank + amount;
      await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, newAmount.toString());
    } else {
      const cash = BigInt(
        (await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`)) ||
          (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) ||
          0,
      );
      const newAmount = cash + amount;
      await db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount.toString());
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount);

    embed
      .setColor(msg.settings.embedColor)
      .setDescription(`Added **${csAmount}** to ${mem}'s ${type} balance.`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = AddMoney;
