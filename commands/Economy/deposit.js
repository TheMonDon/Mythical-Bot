const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Deposit extends Command {
  constructor(client) {
    super(client, {
      name: 'deposit',
      category: 'Economy',
      description: 'Deposit your money into the bank',
      examples: ['deposit'],
      usage: 'deposit <amount | all>',
      aliases: ['dep'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let amount = args.join(' ');

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

    const [balanceRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          cash
        FROM
          economy_balances
        WHERE
          server_id = ?
          AND user_id = ?
      `,
      [msg.guild.id, msg.member.id],
    );
    const cash = BigInt(balanceRows[0]?.cash || economyRows[0]?.start_balance || 0);

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    let csCashAmount = currencySymbol + cash.toLocaleString();
    csCashAmount = this.client.util.limitStringLength(csCashAmount, 0, 1024);

    amount = amount.replace(/,/g, '').replace(currencySymbol, '');
    if (isNaN(amount) || !amount) {
      if (amount.toLowerCase() === 'all') {
        if (cash <= BigInt(0)) {
          return this.client.util.errorEmbed(msg, "You don't have any cash to deposit.", 'Invalid Parameter');
        }

        await this.client.db.execute(
          /* sql */
          `
            INSERT INTO
              economy_balances (server_id, user_id, cash)
            VALUES
              (?, ?, 0) ON DUPLICATE KEY
            UPDATE cash = 0
          `,
          [msg.guild.id, msg.member.id],
        );

        await this.client.db.execute(
          /* sql */ `
            INSERT INTO
              economy_balances (server_id, user_id, bank)
            VALUES
              (?, ?, ?) ON DUPLICATE KEY
            UPDATE bank = bank +
            VALUES
              (bank)
          `,
          [msg.guild.id, msg.member.id, cash.toString()],
        );

        embed.setDescription(`Deposited ${csCashAmount} to your bank.`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Amount');
      }
    }
    amount = BigInt(
      amount
        .replace(/\..*/, '') // Remove everything after the first period
        .replace(/[^0-9,]/g, '') // Keep only digits and commas
        .replace(/,/g, ''), // Remove commas
    );

    if (amount < BigInt(0)) {
      return this.client.util.errorEmbed(msg, "You can't deposit negative amounts of cash", 'Invalid Parameter');
    }
    if (amount > cash) {
      return this.client.util.errorEmbed(
        msg,
        `You don't have that much money to deposit. You currently have ${csCashAmount} in cash.`,
        'Invalid Parameter',
      );
    }
    if (cash <= BigInt(0)) {
      return this.client.util.errorEmbed(msg, "You don't have any cash to deposit", 'Invalid Parameter');
    }

    // Update cash balance
    await this.client.db.execute(
      /* sql */ `
        INSERT INTO
          economy_balances (server_id, user_id, cash)
        VALUES
          (?, ?, ?) ON DUPLICATE KEY
        UPDATE cash = cash -
        VALUES
          (cash)
      `,
      [msg.guild.id, msg.member.id, amount.toString()],
    );

    // Update bank balance
    await this.client.db.execute(
      /* sql */ `
        INSERT INTO
          economy_balances (server_id, user_id, bank)
        VALUES
          (?, ?, ?) ON DUPLICATE KEY
        UPDATE bank = bank +
        VALUES
          (bank)
      `,
      [msg.guild.id, msg.member.id, amount.toString()],
    );

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

    embed.setDescription(`Deposited ${csAmount} to your bank.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Deposit;
