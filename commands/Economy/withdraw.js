const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Withdraw extends Command {
  constructor(client) {
    super(client, {
      name: 'withdraw',
      category: 'Economy',
      description: 'Withdraw your money from the bank',
      usage: 'withdraw <amount | all>',
      aliases: ['with'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let amount = args.join(' ');
    const embed = new EmbedBuilder().setAuthor({
      name: msg.member.displayName,
      iconURL: msg.member.displayAvatarURL(),
    });

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

    // Get the user's current cash and bank balance
    const [balanceRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          cash,
          bank
        FROM
          economy_balances
        WHERE
          server_id = ?
          AND user_id = ?
      `,
      [msg.guild.id, msg.member.id],
    );

    const cash = BigInt(balanceRows[0].cash || economyRows[0]?.start_balance || 0);
    const bank = BigInt(balanceRows[0].bank || 0);

    let csBankAmount = currencySymbol + bank.toLocaleString();
    csBankAmount = this.client.util.limitStringLength(csBankAmount, 0, 1024);

    amount = amount.replace(/,/g, '').replace(currencySymbol, '');
    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        if (bank <= BigInt(0)) return msg.channel.send("You don't have any money to withdraw.");

        const newAmount = bank + cash;
        await this.client.db.execute(
          /* sql */
          `
            INSERT INTO
              economy_balances (server_id, user_id, cash, bank)
            VALUES
              (?, ?, ?, 0) ON DUPLICATE KEY
            UPDATE cash =
            VALUES
              (cash),
              bank = 0
          `,
          [msg.guild.id, msg.member.id, newAmount.toString()],
        );

        embed.setColor(msg.settings.embedColor).setDescription(`Withdrew ${csBankAmount} from your bank!`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
      }
    }

    amount = BigInt(
      amount
        .replace(/\..*/, '') // Remove everything after the first period
        .replace(/[^0-9,]/g, '') // Keep only digits and commas
        .replace(/,/g, ''), // Remove commas
    );

    if (amount < BigInt(0)) return this.client.util.errorEmbed(msg, "You can't withdraw negative amounts of money.");
    if (bank <= BigInt(0)) return this.client.util.errorEmbed(msg, "You don't have any money to withdraw.");
    if (amount > bank)
      return this.client.util.errorEmbed(
        msg,
        `You don't have that much money to withdraw. You currently have ${csBankAmount} in the bank.`,
      );

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

    const newBankAmount = bank - amount;
    await this.client.db.execute(
      /* sql */
      `
        INSERT INTO
          economy_balances (server_id, user_id, bank)
        VALUES
          (?, ?, ?) ON DUPLICATE KEY
        UPDATE bank =
        VALUES
          (bank)
      `,
      [msg.guild.id, msg.member.id, newBankAmount.toString()],
    );

    const newCashAmount = cash + amount;
    await this.client.db.execute(
      /* sql */
      `
        INSERT INTO
          economy_balances (server_id, user_id, cash)
        VALUES
          (?, ?, ?) ON DUPLICATE KEY
        UPDATE cash =
        VALUES
          (cash)
      `,
      [msg.guild.id, msg.member.id, newCashAmount.toString()],
    );

    embed.setColor(msg.settings.embedColor).setDescription(`Withdrew ${csAmount} from your bank.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Withdraw;
