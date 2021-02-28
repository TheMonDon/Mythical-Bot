const Command = require('../../base/Command.js');
const db = require('quick.db');

module.exports = class setCurrency extends Command {
  constructor (client) {
    super(client, {
      name: 'set-currency',
      category: 'Economy',
      description: 'Sets the currency symbol',
      usage: 'set-currency $',
      aliases: ['setcurrency', 'sc'],
      guildOnly: true
    });    
  }

  run (msg, args) {
    const member = msg.member;
    const p = msg.settings.prefix;

    let symbol = args.join(' ');

    if (!member.permissions.has('MANAGE_GUILD')) return msg.channel.send('Sorry this command requires you to have **Manage Guild** permissions.');

    const oldSymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$'; //get the old symbol

    if (!symbol) return msg.channel.send(`The currency symbol for this server is: ${oldSymbol} \nUsage: ${p}set-currency <symbol>`);

    if (symbol.length > 50) return msg.channel.send('The maximum length for the currency symbol is 50 characters.');

    if (symbol === oldSymbol) return msg.channel.send('That is already the currency symbol.');
    
    symbol = symbol.trim();

    db.set(`servers.${msg.guild.id}.economy.symbol`, symbol); //reset the new symbol

    return msg.channel.send(`The currency symbol has been changed to: ${symbol}`);
  }
};