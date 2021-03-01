/* eslint-disable no-undef */
const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');

class baltop extends Command {
  constructor (client) {
    super(client, {
      name: 'baltop',
      description: 'Get the top 10 balances from Survival server',
      usage: 'baltop',
      category: 'Minecraft'
    });
  }

  async run (msg, args) {
    const p = msg.settings.prefix;

    let page = 1;
    let server = 'survival';
    if (!args || args.length < 1) {
      server = 'survival';
      page = 1;
    } else if (args.length === 1) {
      page = parseInt(args[0]);
    } else {
      page = parseInt(args[0]);
      server = args[1].toLowerCase();
    }

    if (isNaN(page) || page === Infinity) return msg.channel.send(`Incorrect Usage: ${p}baltop [page] [server]`);

    let min = 0;
    for (let i = 1; page > i; i++) min += 10;

    if (server === 'survival') {
      pool.query(`SELECT double_value,uuid FROM plan.plan_extension_user_values WHERE provider_id = 15 ORDER BY double_value DESC LIMIT ${min}, 10`, function (error, results) {
        if (error) return console.error(error);
        if (!results || results.length < 1) return msg.channel.send('That page does not exist.');
        const arr = [];

        for (let i = 0; i < results.length; i++) {
          pool.query(`SELECT * FROM plan.plan_users WHERE uuid = '${results[i].uuid}'`, function (error, name) {
            if (error || !name) return msg.channel.send('That page does not exist.');

            arr.push(`${i + 1 + min}. ${(name[0] && name[0].name) || results[i].uuid}: $${results[i].double_value.toLocaleString()}`);

            if (i === results.length - 1) {
              arr.sort((a, b) => a - b);

              const em = new DiscordJS.MessageEmbed()
                .setTitle('Survival Balance Leaderboard')
                .setDescription(arr.join('\n'))
                .setColor('RANDOM');
              return msg.channel.send(em);
            }
          });
        }
      });
    } else {
      return msg.channel.send('I could not find a server with that name. \nCurrent Servers: \`Survival\`');
    }
  }
}

module.exports = baltop;
