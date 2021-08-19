const Command = require('../../base/Command.js');
const db = require('quick.db');

class SetCurrency extends Command {
  constructor (client) {
    super(client, {
      name: 'set-currency',
      category: 'Economy',
      description: 'Sets the currency symbol',
      usage: 'set-currency $',
      aliases: ['setcurrency', 'sc'],
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  run (msg, args) {
    let symbol = args.join(' ');
    const oldSymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';

    if (!symbol) return msg.channel.send(`The currency symbol for this server is: ${oldSymbol} \nUsage: ${msg.settings.prefix}set-currency <symbol>`);

    if (symbol.length > 50) return msg.channel.send('The maximum length for the currency symbol is 50 characters.');

    if (symbol === oldSymbol) return msg.channel.send('That is already the currency symbol.');

    symbol = symbol.trim();

    db.set(`servers.${msg.guild.id}.economy.symbol`, symbol);

    return msg.channel.send(`The currency symbol has been changed to: ${symbol}`);
  }
}

module.exports = SetCurrency;
