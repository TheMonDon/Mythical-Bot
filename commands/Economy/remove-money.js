const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class RemoveMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'remove-money',
      category: 'Economy',
      description:
        "Remove money from a users's cash or bank balance. \nIf the cash or bank argument isn't given, it will be removed from the cash part.",
      usage: 'remove-money [cash | bank] <member> <amount>',
      aliases: ['removemoney', 'removebal'],
      permLevel: 'Administrator',
      examples: ['remove-money cash @TheMonDon 1', 'remove-money themondon 1'],
      requiredArgs: 2,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    let type = 'cash';
    let mem;
    let amount;

    const [economyRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const currencySymbol = economyRows[0]?.symbol || '$';

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

    if (isNaN(amount)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Amount');
    }
    if (parseInt(amount) === Infinity) {
      return this.client.util.errorEmbed(msg, "You can't remove Infinity from a member", 'Invalid Amount');
    }
    if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    if (mem.user.bot) return this.client.util.errorEmbed(msg, "You can't remove money from bots.");

    amount = BigInt(parseInt(amount));
    if (type === 'bank') {
      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_balances (server_id, user_id, bank)
          VALUES
            (?, ?, ?) ON DUPLICATE KEY
          UPDATE bank = bank -
          VALUES
            (bank)
        `,
        [msg.guild.id, mem.id, amount.toString()],
      );
    } else {
      await this.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_balances (server_id, user_id, cash)
          VALUES
            (?, ?, ?) ON DUPLICATE KEY
          UPDATE cash = cash -
          VALUES
            (cash)
        `,
        [msg.guild.id, mem.id, amount.toString()],
      );
    }

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount);

    embed
      .setColor(msg.settings.embedColor)
      .setDescription(`Removed **${csAmount}** from ${mem}'s ${type} balance.`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RemoveMoney;
