const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class SetStartBalance extends Command {
  constructor(client) {
    super(client, {
      name: 'set-start-balance',
      category: 'Economy',
      description: 'View or set the starting balance for the server',
      usage: 'set-start-balance [amount]',
      aliases: ['setstartbalance'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();

    const [economyRows] = await connection.execute(
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

    const amount = parseInt(args.join('').replace(/[^0-9\\.-]|-/g, ''));

    if (isNaN(amount) || amount < 0) {
      const oldStartingBalance = economyRows[0].start_balance || 0;

      connection.release();
      return msg.channel.send(
        `The starting balance for this server is: ${currencySymbol}${oldStartingBalance.toLocaleString()} \nTo disable the starting balance, set it to 0. \nUsage: ${
          msg.settings.prefix
        }set-start-balance <amount>`,
      );
    }

    if (amount > 1000000000000) return msg.channel.send('The max starting balance is one trillion.');

    await connection.execute(
      /* sql */ `
        INSERT INTO
          economy_settings (server_id, start_balance)
        VALUES
          (?, ?) ON DUPLICATE KEY
        UPDATE start_balance =
        VALUES
          (start_balance)
      `,
      [msg.guild.id, amount],
    );

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setColor(msg.settings.embedSuccessColor)
      .setDescription(
        `The starting balance for new members has been set to: ${currencySymbol}${amount.toLocaleString()}`,
      );

    connection.release();
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = SetStartBalance;
