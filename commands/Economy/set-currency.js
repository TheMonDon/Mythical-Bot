const Command = require('../../base/Command.js');

class SetCurrency extends Command {
  constructor(client) {
    super(client, {
      name: 'set-currency',
      category: 'Economy',
      description: 'Sets the currency symbol',
      usage: 'set-currency [currency symbol]',
      aliases: ['setcurrency'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const symbol = args.join(' ').trim();
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
    const oldSymbol = economyRows[0]?.symbol || '$';

    if (!symbol) {
      connection.release();
      return msg.channel.send(
        `The currency symbol for this server is: ${oldSymbol} \nUsage: ${msg.settings.prefix}set-currency <symbol>`,
      );
    }

    // Remove custom emojis before checking for numbers
    const filteredSymbol = symbol.replace(/<a?:\w+:\d+>/g, '');

    if (/\d/.test(filteredSymbol)) {
      connection.release();
      return msg.channel.send('The currency symbol cannot contain numbers.');
    }

    if (filteredSymbol.length > 50) {
      connection.release();
      return msg.channel.send('The maximum length for the currency symbol is 50 characters.');
    }

    if (filteredSymbol === oldSymbol) {
      connection.release();
      return msg.channel.send('That is already the currency symbol.');
    }

    await connection.execute(
      /* sql */ `
        INSERT INTO
          economy_settings (server_id, symbol)
        VALUES
          (?, ?) ON DUPLICATE KEY
        UPDATE symbol =
        VALUES
          (symbol)
      `,
      [msg.guild.id, symbol],
    );
    connection.release();

    return msg.channel.send(`The currency symbol has been changed to: ${symbol}`);
  }
}

module.exports = SetCurrency;
