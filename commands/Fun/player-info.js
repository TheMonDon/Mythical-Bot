const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');
const { JSONPath } = require('jsonpath-plus');
const request = require('request'); // request is depreciated i will find something else later
const mysql = require('mysql2');
const moment = require('moment');
require('moment-duration-format');
const config = require('./../../config.js');

class playerinfo extends Command {
  constructor(client) {
    super(client, {
      name: 'player-info',
      description: 'Get information about minecraft player from discord or minecraft username.',
      usage: 'player-info [member]',
      category: 'Fun',
      aliases: ['mctodc', 'dctomc', 'playerinfo', 'pinfo']
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
        user = text.join(' ').trim().replace(/'/g, '').replace(/"/g, '');
      }
    }

    let member = !!server.members.cache.get(user)

    const connection = mysql.createPool({
      host: config.mysqlHost,
      user: config.mysqlUsername,
      password: config.mysqlPassword,
      waitForConnections: true,
      connectionLimit: 30,
      queueLimit: 0
    });

    const errMsg = 'I could not find that user. Did they sync their accounts using `!link`? \nAdd \"\" around mc username if their discord name is the same.';

    if (!member) {
      const nameRegex = new RegExp(/^\w{3,16}$/);
      // Make sure the username is a valid MC username
      if (!nameRegex.test(user)) {
        const em = new DiscordJS.MessageEmbed()
          .setTitle('Invalid Username')
          .setColor('FF0000')
          .setDescription(`\`${user}\` is not a valid username.`);
        return msg.channel.send(em);
      }

      let body;
      try {
        body = await fetch.get(`https://api.mojang.com/users/profiles/minecraft/${user}`);
        const uuid = body.body.id;
        const id = uuid.substr(0, 8) + '-' + uuid.substr(8, 4) + '-' + uuid.substr(12, 4) + '-' + uuid.substr(16, 4) + '-' + uuid.substr(20);

        connection.query(`SELECT * FROM ranksync.player WHERE uuid = '${id}'`, function (error, results) {
          const player_id = results && results[0] && results[0].id;
          if (error || !player_id) { member = false; }

          connection.query(`SELECT * FROM ranksync.synced_players WHERE player_id = ${player_id}`, async function (error, results) {
            if (error) { member = false; }
            user = results && results[0] && results[0].identifier;
            if (user && server.members.cache.get(user)) {
              member = true;
              user1 = server.members.cache.get(user);
            } else {
              member = false;
            }

            return information(id, connection, member, user1, msg);
          });
        });
      } catch (err) {
        const em = new DiscordJS.MessageEmbed()
          .setTitle('Account Not Found')
          .setColor('FF0000')
          .setDescription(`An account with the name \`${user}\` was not found.`);
        return msg.channel.send(em);
      }
    } else {
      connection.query(`SELECT player_id FROM ranksync.synced_players WHERE identifier = ${user}`, function (error, results) {
        const player_id = results && results[0] && results[0].player_id;
        if (error || !player_id) return msg.channel.send(errMsg);

        connection.query(`SELECT * FROM ranksync.player WHERE id = ${player_id}`, async function (error, results) {
          if (error) return msg.channel.send(errMsg);
          const id = results && results[0].uuid;

          return information(id, connection, member, user1, msg);
        });
      });
    }
  }
}

const information = async function (id, connection, member, user1, msg) {
  try {
    const { body } = await fetch.get(`https://api.mojang.com/user/profiles/${id}/names`);
    const nc = JSONPath({ path: '*.name', json: body }).join(', ');
    const name = nc.slice(nc.lastIndexOf(',') + 1);

    connection.query(`SELECT * FROM chatreaction.survival_newreactionstats WHERE uuid = '${id}'`, function (error, results) {
      let wins;
      if (error) {
        wins = false;
      } else {
        wins = results && results[0] && results[0].wins || false;
      }

      connection.query(`SELECT * FROM friends.fr_players WHERE player_uuid = '${id}'`, function (error, results) {
        let last_online;
        if (error) {
          last_online = false;
        } else {
          last_online = results && results[0] && results[0].last_online.toString() || false;
        }

        connection.query(`SELECT SUM(session_end - session_start) FROM plan.plan_sessions WHERE uuid = '${id}'`, async function (error, results) {
          let out;
          if (error) {
            out = '0s'
          } else {
            const sum = results[0]['SUM(session_end - session_start)'];
            out = moment.duration(sum).format('hh[h] mm[m] s[s]');
          }

          const em = new DiscordJS.MessageEmbed()
            .setTitle(`${name}'s Account Information`)
            .setColor('00FF00')
            .setImage(`https://mc-heads.net/body/${id}`)
            .addField('Name Changes History', nc || 'Error fetching data...', false)
            .addField('UUID', id, false)
            .addField('NameMC Link', `Click [here](https://es.namemc.com/profile/${id}) to go to their NameMC Profile`, false);
          if (member) em.addField('Discord', `${user1.user.tag} (${user1.id})`, false);
          if (!!wins) em.addField('Reaction Wins', wins, false);
          if (!!last_online) em.addField('Last Online', last_online, false);
          if (out != '0s') em.addField('Play Time', out, false);

          return msg.channel.send(em);
        });
      });
    });
  } catch (err) {
    console.error(err);
  }
};

module.exports = playerinfo;