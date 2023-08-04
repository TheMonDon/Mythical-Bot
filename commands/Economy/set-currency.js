const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class SetCurrency extends Command {
  constructor(client) {
    super(client, {
      name: 'set-currency',
      category: 'Economy',
      description: 'Sets the currency symbol',
      usage: 'set-currency <currency symbol>',
      aliases: ['setcurrency'],
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let symbol = args.join(' ');
    const oldSymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    if (!symbol)
      return msg.channel.send(
        `The currency symbol for this server is: ${oldSymbol} \nUsage: ${msg.settings.prefix}set-currency <symbol>`,
      );

    if (symbol.length > 50) return msg.channel.send('The maximum length for the currency symbol is 50 characters.');

    if (symbol === oldSymbol) return msg.channel.send('That is already the currency symbol.');

    symbol = symbol.trim();

    await db.set(`servers.${msg.guild.id}.economy.symbol`, symbol);

    return msg.channel.send(`The currency symbol has been changed to: ${symbol}`);
  }
}

module.exports = SetCurrency;
