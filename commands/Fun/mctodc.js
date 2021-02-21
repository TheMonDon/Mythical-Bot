const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');
const { JSONPath } = require('jsonpath-plus');
const request = require('request'); // request is depreciated i will find something else later
const mysql = require('mysql');

class mctodc extends Command {
  constructor(client) {
    super(client, {
      name: 'mctodc',
      description: 'Find someones minecraft username from their discord',
      usage: 'mctodc [member]',
      category: 'Fun'
    });
  }

  async run(msg, text) {
    const server = msg.guild;

    let user;
    let user1;
    if (!text || text.length < 1) {
      user1 = msg.member;
      user = user1.id;
    } else {
      user1 = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text.join(' ')}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text.join(' ').toLowerCase()}`));
      if (user1) {
        user = user1.id;
      } else {
        user = text.join(' ').trim().replace(/\'/g, '');
      }
    }

    let member;
    server.members.cache.get(user) ? member = true : member = false;

    const connection = mysql.createConnection({
      host: 'localhost',
      user: 'craftersisland',
      password: 'Jmonahan13',
      database: 'ranksync'
    });

    const crDB = mysql.createConnection({
      host: 'localhost',
      user: 'craftersisland',
      password: 'Jmonahan13',
      database: 'chatreaction'
    });

    const fDB = mysql.createConnection({
      host: 'localhost',
      user: 'craftersisland',
      password: 'Jmonahan13',
      database: 'friends'
    });

    fDB.connect();
    crDB.connect();
    connection.connect();

    const errMsg = "I could not find that user. Did they sync their accounts using `!link`? \nAdd '' around mc username if their discord name is the same.";

    if (!member) {
      request({
        url: `https://api.mojang.com/users/profiles/minecraft/${user}`,
        json: true
      }, async function (error, response, body) {
        if (!error && response.statusCode === 200) {
          const uuid = body.id
          const id = uuid.substr(0,8) + "-" + uuid.substr(8,4) + "-" + uuid.substr(12,4) + "-" + uuid.substr(16,4) + "-" + uuid.substr(20);

          return information(id, crDB, fDB, connection, member, user1, msg);
        } else {
          const em = new DiscordJS.MessageEmbed()
            .setTitle('Account Not Found')
            .setColor('FF0000')
            .setDescription(`An account with the name \`${user}\` was not found.`);
          return msg.channel.send(em);
        }
      });
    } else {
      connection.query(`SELECT player_id FROM synced_players WHERE identifier = ${user}`, function (error, results, fields) {
        const player_id = results && results[0] && results[0].player_id;
        if (error || !player_id) return msg.channel.send(errMsg);

        connection.query(`SELECT * FROM player WHERE id = ${player_id}`, async function (error, results, fields) {
          if (error) return msg.channel.send(errMsg);
          const id = results && results[0].uuid;

          information(id, crDB, fDB, connection, member, user1, msg);
        });
      });
    }
  }
}

const information = async function (id, crDB, fDB, connection, member, user1, msg) {
  try {
    const { body } = await fetch.get(`https://api.mojang.com/user/profiles/${id}/names`);
    const json = body;
    const nc = JSONPath({ path: '*.name', json }).join(', ');
    const name = nc.slice(nc.lastIndexOf(',') + 1);

    crDB.query(`SELECT * FROM survival_newreactionstats WHERE uuid = '${id}'`, function (error, results, fields) {
      if (error) console.log(error);
      const wins = results && results[0] && results[0].wins || 0;

      fDB.query(`SELECT * FROM fr_players WHERE player_uuid = '${id}'`, function (error, results, fields) {
        if (error) console.log(error);
        const last_online = results && results[0] && results[0].last_online.toString() || 'Never Joined';

        const em = new DiscordJS.MessageEmbed()
          .setTitle(`${name}'s Account Information`)
          .setColor('00FF00')
          .setImage(`https://mc-heads.net/body/${id}`)
          .addField('Name Changes History', nc || 'Error fetching data...', false)
          .addField('UUID', id, false)
          .addField('NameMC Link', `Click [here](https://es.namemc.com/profile/${id}) to go to their NameMC Profile`, false);
        if (member) em.addField('Discord', `${user1.user.tag} \(${user1.id}\)`, false);
        em.addField('Reaction Wins', wins, false);
        em.addField('Last Online', last_online, false);

        crDB.end();
        fDB.end();
        connection.end();

        return msg.channel.send(em);
      });
    });
  } catch (err) {
    console.error(err);
  }
};

module.exports = mctodc;