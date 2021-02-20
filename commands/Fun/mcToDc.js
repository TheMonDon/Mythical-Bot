const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const request = require('request'); // request is depreciated i will find something else later
const fetch = require('node-superfetch');
const { JSONPath } = require('jsonpath-plus');
const mysql = require('mysql');

class mctodc extends Command {
  constructor(client) {
    super(client, {
      name: 'mctodc',
      description: 'Find someones minecraft username from their discord',
      usage: 'mcToDc [member]',
      category: 'Fun'
    });
  }

  async run(msg, text) { // eslint-disable-line no-unused-vars
    let user;
    if (!text || text.length < 1) {
      user = msg.author.id;
    } else {
      user = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text.join(' ')}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text.join(' ').toLowerCase()}`)) || msg.member;
      user = user.id
    }

    const connection = mysql.createConnection({
      host: 'localhost',
      user: 'craftersisland',
      password: 'Jmonahan13',
      database: 'ranksync'
    });

    connection.connect();

    connection.query(`SELECT player_id FROM synced_players WHERE identifier = ${user}`, function (error, results, fields) {
      if (error) return msg.channel.send(`I could not find that user, did they sync their account on the server?`);
      const player_id = results[0].player_id;
      console.log('1');
      connection.query(`SELECT * FROM player WHERE id = ${player_id}`, async function (error, results, fields) {
        if (error) return msg.channel.send(`I could not find that user, did they sync their account on the server?`);
        const id = results[0].uuid;
        console.log('2');

        try {
          console.log('3');
          const { body } = await fetch.get(`https://api.mojang.com/user/profiles/${id}/names`);
          const json = body;
          const nc = JSONPath({ path: '*.name', json }).join(', ');
          const em = new DiscordJS.MessageEmbed()
            .setTitle(`${rn}'s Account Information`)
            .setColor('00FF00')
            .setImage(`https://mc-heads.net/body/${id}`)
            .addField('Name Changes History', nc || 'Error fetching data...', false)
            .addField('UUID', id, false)
            .addField('NameMC Link', `Click [here](https://es.namemc.com/profile/${id}) to go to their NameMC Profile`, false);
          console.log('4');
          msg.channel.send(em);
        } catch (err) {
          console.error(err);
        }

        connection.end();
      });
    });
  }
}

module.exports = mctodc;
