const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class AddMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'add-money',
      category: 'Economy',
      description:
        "Add money to a member's cash or bank balance. \nIf the cash or bank argument isn't given, it will be added to the cash part.",
      usage: 'add-money [cash | bank] <member> <amount>',
      aliases: ['addmoney', 'addbal'],
      permLevel: 'Moderator',
      guildOnly: true,
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    let type = 'cash';
    let mem;
    let amount;

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (args.length === 2) {
      mem = await this.client.util.getMember(msg, args[0]);
      amount = args[1].replace(/[^0-9\\.]/g, '');
    } else {
      mem = await this.client.util.getMember(msg, args[1]);
      amount = args[2].replace(/[^0-9\\.]/g, '');
    }

    if (['cash', 'bank'].includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    }

    if (isNaN(amount)) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    if (mem.user.bot) return this.client.util.errorEmbed(msg, 'You can\'t add money to bots.');

    amount = BigInt(amount);
    if (type === 'bank') {
      const bank = BigInt(db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`) || 0);
      const newAmount = bank + amount;
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, newAmount.toString());
    } else {
      const cash = BigInt(
        db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`) ||
          db.get(`servers.${msg.guild.id}.economy.startBalance`) ||
          0,
      );
      const newAmount = cash + amount;
      db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, newAmount.toString());
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = csAmount.length > 1024 ? `${csAmount.slice(0, 1021) + '...'}` : csAmount;

    embed
      .setColor(msg.settings.embedColor)
      .setDescription(`:white_check_mark: Added **${csAmount}** to ${mem}'s ${type} balance.`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = AddMoney;
