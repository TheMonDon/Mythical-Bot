const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class GiveMoney extends Command {
  constructor(client) {
    super(client, {
      name: 'give-money',
      description: 'Pay another user',
      category: 'Economy',
      usage: 'give-money <user> <amount | all>',
      aliases: ['givemoney', 'pay', 'send', 'give'],
      requiredArgs: 2,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setColor(msg.settings.embedErrorColor);

    const mem = await this.client.util.getMember(msg, args[0]);

    if (!mem) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    } else if (mem.id === msg.author.id) {
      return this.client.util.errorEmbed(msg, 'You cannot trade money with yourself. That would be pointless.');
    } else if (mem.user.bot) {
      return this.client.util.errorEmbed(msg, "You can't give bots money.");
    }

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

    const authCash = BigInt(balanceRows[0].cash || economyRows[0]?.start_balance || 0);

    let amount = args[1].replace(/,/g, '').replace(currencySymbol, '');

    let csCashAmount = currencySymbol + authCash.toLocaleString();
    csCashAmount = this.client.util.limitStringLength(csCashAmount, 0, 1024);

    if (isNaN(amount)) {
      if (amount.toLowerCase() === 'all') {
        if (authCash <= BigInt(0)) {
          return this.client.util.errorEmbed(msg, "You can't pay someone when you have no money", 'Invalid Parameter');
        }

        // Set the author's cash to 0
        await this.client.db.execute(
          /* sql */
          `
            INSERT INTO
              economy_balances (server_id, user_id, cash)
            VALUES
              (?, ?, 0) ON DUPLICATE KEY
            UPDATE cash = 0
          `,
          [msg.guild.id, msg.author.id],
        );

        // Add the cash to the recipient
        await this.client.db.execute(
          /* sql */ `
            INSERT INTO
              economy_balances (server_id, user_id, cash)
            VALUES
              (?, ?, ?) ON DUPLICATE KEY
            UPDATE cash = cash +
            VALUES
              (cash)
          `,
          [msg.guild.id, mem.id, authCash.toString()],
        );

        embed.setColor(msg.settings.embedColor).setDescription(`${mem} has received your ${csCashAmount}.`);
        return msg.channel.send({ embeds: [embed] });
      } else {
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
      }
    }

    if (
      parseInt(
        amount
          .replace(/\..*/, '') // Remove everything after the first period
          .replace(/[^0-9,]/g, '') // Keep only digits and commas
          .replace(/,/g, ''), // Remove commas
      ) === Infinity
    ) {
      return this.client.util.errorEmbed(msg, "You can't give Infinity money to someone", 'Invalid Amount');
    }

    amount = BigInt(
      parseInt(
        amount
          .replace(/\..*/, '') // Remove everything after the first period
          .replace(/[^0-9,]/g, '') // Keep only digits and commas
          .replace(/,/g, ''), // Remove commas
      ),
    );

    if (amount > authCash) {
      return this.client.util.errorEmbed(
        msg,
        `You don't have that much money to give. You currently have ${csCashAmount}`,
        'Invalid Parameter',
      );
    } else if (amount < BigInt(0)) {
      return this.client.util.errorEmbed(msg, "You can't give negative amounts of money.", 'Invalid Parameter');
    } else if (amount === BigInt(0)) {
      return this.client.util.errorEMbed(msg, "You can't give someone nothing.", 'Invalid Parameter');
    }

    // Subtract the amount from the author's cash
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
      [msg.guild.id, msg.member.id, amount.toString()],
    );

    // Add the amount to the recipient's cash
    await this.client.db.execute(
      /* sql */ `
        INSERT INTO
          economy_balances (server_id, user_id, cash)
        VALUES
          (?, ?, ?) ON DUPLICATE KEY
        UPDATE cash = cash +
        VALUES
          (cash)
      `,
      [msg.guild.id, mem.id, amount.toString()],
    );

    let csAmount = currencySymbol + amount.toLocaleString();
    csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);

    embed.setColor(msg.settings.embedColor).setDescription(`${mem} has received your ${csAmount}.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = GiveMoney;
