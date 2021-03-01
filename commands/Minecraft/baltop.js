const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-fetch');
const mysql = require('mysql2');
const config = require('./../../config.js');

class baltop extends Command {
  constructor(client) {
    super(client, {
      name: 'baltop',
      description: 'Get the top 10 balances from Survival server',
      usage: 'baltop',
      category: 'Minecraft'
    });
  }

  async run(msg, args) {
    let query = args.join(' '); // Not using this part yet. Also pagination maybe? Would result in uuids.
    let server = 'survival';

    if (!args || args.length < 1) server = 'survival';

    const pool = mysql.createPool({
      host: config.mysqlHost,
      user: config.mysqlUsername,
      password: config.mysqlPassword
    });

    if (server === 'survival') {

      pool.query(`SELECT double_value,uuid FROM plan.plan_extension_user_values WHERE provider_id = 15 ORDER BY double_value DESC LIMIT 10`, function (error, results) {
        if (error) return console.error(error);
        const arr = [];

        for (let i = 0; i < results.length; i++) {
          pool.query(`SELECT * FROM plan.plan_users WHERE uuid = '${results[i].uuid}'`, function (error, name) {
            if (error) return console.error(error);
            arr.push(`${i + 1}. ${(name[0] && name[0].name) || results[i].uuid}: $${results[i].double_value.toLocaleString()}`);
            // setTimeout(function(){}, 100);

            if (i === results.length - 1) {
              const em = new DiscordJS.MessageEmbed()
                .setTitle('Survival Balance Leaderboard')
                .setDescription(arr.sort().join('\n'))
                .setColor('RANDOM')
              return msg.channel.send(em);
            }
          });
        }
      });
    }
  }
}

module.exports = baltop;
