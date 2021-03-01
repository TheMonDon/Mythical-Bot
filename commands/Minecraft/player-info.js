const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const Nfetch = require('node-superfetch');
const { JSONPath } = require('jsonpath-plus');
const moment = require('moment');
require('moment-duration-format');

class playerinfo extends Command {
  constructor(client) {
    super(client, {
      name: 'player-info',
      description: 'Get information about minecraft player from discord or minecraft username.',
      usage: 'player-info [member]',
      category: 'Minecraft',
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

    let member = !!server.members.cache.get(user);

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

      const body = await Nfetch.get(`https://api.mojang.com/users/profiles/minecraft/${user}`)
        .catch(() => {
          const em = new DiscordJS.MessageEmbed()
            .setTitle('Account Not Found')
            .setColor('FF0000')
            .setDescription(`An account with the name \`${user}\` was not found.`);
          return msg.channel.send(em);
        });
      const uuid = body.body.id;
      const id = uuid.substr(0, 8) + '-' + uuid.substr(8, 4) + '-' + uuid.substr(12, 4) + '-' + uuid.substr(16, 4) + '-' + uuid.substr(20);

      pool.query(`SELECT * FROM ranksync.player WHERE uuid = '${id}'`, function (error, results) {
        const player_id = results?.[0]?.id;
        if (error || !player_id) { member = false; }

        pool.query(`SELECT * FROM ranksync.synced_players WHERE player_id = ${player_id}`, async function (error, results) {
          if (error) { member = false; }
          user = results?.[0]?.identifier;
          if (user && server.members.cache.get(user)) {
            member = true;
            user1 = server.members.cache.get(user);
          } else {
            member = false;
          }

          return information(id, pool, member, user1, msg);
        });
      });
    } else {
      pool.query(`SELECT player_id FROM ranksync.synced_players WHERE identifier = ${user}`, function (error, results) {
        const player_id = results?.[0]?.player_id;
        if (error || !player_id) return msg.channel.send(errMsg);

        pool.query(`SELECT * FROM ranksync.player WHERE id = ${player_id}`, async function (error, results) {
          if (error) return msg.channel.send(errMsg);
          const id = results[0]?.uuid;

          return information(id, pool, member, user1, msg);
        });
      });
    }
  }
}

const information = async function (id, pool, member, user1, msg) {
    const { body } = await Nfetch.get(`https://api.mojang.com/user/profiles/${id}/names`)
      .catch(() => {
        const em = new DiscordJS.MessageEmbed()
          .setTitle('Account Not Found')
          .setColor('FF0000')
          .setDescription(`An account with the name \`${user}\` was not found.`);
        return msg.channel.send(em);
      });
    const nc = JSONPath({ path: '*.name', json: body }).join(', ');
    const name = nc.slice(nc.lastIndexOf(',') + 1);

    pool.query(`SELECT * FROM chatreaction.survival_newreactionstats WHERE uuid = '${id}'`, function (error, results) {
      let wins;
      if (error) {
        wins = false;
      } else {
        wins = results?.[0]?.wins || false;
      }

      pool.query(`SELECT * FROM friends.fr_players WHERE player_uuid = '${id}'`, function (error, results) {
        let last_online;
        if (error) {
          last_online = false;
        } else {
          last_online = results?.[0]?.last_online.toString() || false;
        }

        pool.query(`SELECT SUM(session_end - session_start) FROM plan.plan_sessions WHERE uuid = '${id}'`, async function (error, results) {
          let out;
          if (error) {
            out = '0s';
          } else {
            const sum = results?.[0]['SUM(session_end - session_start)'];
            out = moment.duration(sum).format('hh[h] mm[m] s[s]');
          }

          pool.query(`SELECT double_value FROM plan.plan_extension_user_values WHERE provider_id = 15 AND uuid = '${id}'`, function (error, results) {
            let bal;
            if (error) {
              bal = 0;
            } else {
              bal = results?.[0]?.double_value || 0;
            }

            const em = new DiscordJS.MessageEmbed()
              .setTitle(`${name}'s Account Information`)
              .setColor('00FF00')
              .setImage(`https://mc-heads.net/body/${id}`)
              .addField('Name Changes History', nc || 'Error fetching data...', false)
              .addField('UUID', id, false)
              .addField('NameMC Link', `Click [here](https://es.namemc.com/profile/${id}) to go to their NameMC Profile`, false);
            if (member) em.addField('Discord', `${user1.user.tag} (${user1.id})`, false);
            if (wins) em.addField('Reaction Wins', wins, false);
            if (last_online) em.addField('Last Online', last_online, false);
            if (out != '0s') em.addField('Play Time', out, false);
            if (bal) em.addField('Survival Balance', `$${bal.toLocaleString()}`, false);

            return msg.channel.send(em);
          });
        });
      });
    });
};

module.exports = playerinfo;