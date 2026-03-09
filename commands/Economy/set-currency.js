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
    const oldSymbol = economyRows[0]?.symbol || '$';

    if (!symbol) {
      return msg.channel.send(
        `The currency symbol for this server is: ${oldSymbol} \nUsage: ${msg.settings.prefix}set-currency <symbol>`,
      );
    }

    // Remove custom emojis before checking for numbers
    const filteredSymbol = symbol.replace(/<a?:\w+:\d+>/g, '');

    if (/\d/.test(filteredSymbol)) {
      return msg.channel.send('The currency symbol cannot contain numbers.');
    }

    if (filteredSymbol.length > 50) {
      return msg.channel.send('The maximum length for the currency symbol is 50 characters.');
    }

    if (filteredSymbol === oldSymbol) {
      return msg.channel.send('That is already the currency symbol.');
    }

    await this.client.db.execute(
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

    return msg.channel.send(`The currency symbol has been changed to: ${symbol}`);
  }
}

module.exports = SetCurrency;
