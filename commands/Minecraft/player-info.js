/* global pool */
const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const DiscordJS = require('discord.js');
const Nfetch = require('node-superfetch');
const { JSONPath } = require('jsonpath-plus');
const moment = require('moment');
require('moment-duration-format');

class playerinfo extends Command {
  constructor (client) {
    super(client, {
      name: 'player-info',
      description: 'Get information about minecraft player from discord or minecraft username.',
      usage: 'player-info [member]',
      category: 'Minecraft',
      aliases: ['mctodc', 'dctomc', 'playerinfo', 'pinfo']
    });
  }

  async run (msg, text) {
    let user;
    let user1;
    if (!text || text.length < 1) {
      user1 = msg.member;
      user = user1.id;
    } else {
      user1 = getMember(msg, text.join(' '));
      user1 ? user = user1.id : user = text.join(' ').trim().replace(/'/g, '').replace(/"/g, '');
    }

    let member = !!msg.guild.members.cache.get(user);

    const errMsg = 'I could not find that user. Did they sync their accounts using `!link`? \nAdd "" around mc username if their discord name is the same.';

    const errorEmbed = new DiscordJS.MessageEmbed()
      .setTitle('Account Not Found')
      .setColor('FF0000')
      .setDescription(`An account with the name \`${user || user1}\` was not found.`);

    if (!member) {
      const nameRegex = /^\w{3,16}$/;
      // Make sure the username is a valid MC username
      if (!nameRegex.test(user)) {
        const em = new DiscordJS.MessageEmbed()
          .setTitle('Invalid Username')
          .setColor('FF0000')
          .setDescription(`\`${user}\` is not a valid username.`);
        console.log(user);
        return msg.channel.send(em);
      }

      const body = await Nfetch
        .get(`https://api.mojang.com/users/profiles/minecraft/${user}`)
        .catch(() => {
          return msg.channel.send(errorEmbed);
        });
      if (!body) return msg.channel.send(errorEmbed);
      const uuid = body.body.id;
      if (!uuid) return msg.channel.send(errorEmbed);
      const id = uuid?.substr(0, 8) + '-' + uuid.substr(8, 4) + '-' + uuid.substr(12, 4) + '-' + uuid.substr(16, 4) + '-' + uuid.substr(20);

      pool.query(`SELECT * FROM ranksync.player WHERE uuid = '${id}'`, function (error, results) {
        const playerID = results?.[0]?.id;
        if (error || !playerID) { member = false; }

        pool.query(`SELECT * FROM ranksync.synced_players WHERE player_id = ${playerID}`, async function (error, results) {
          if (error) { member = false; }
          user = results?.[0]?.identifier;
          if (user && msg.guild.members.cache.get(user)) {
            member = true;
            user1 = msg.guild.members.cache.get(user);
          } else {
            member = false;
          }

          return information(id, pool, member, user1, msg);
        });
      });
    } else {
      pool.query(`SELECT player_id FROM ranksync.synced_players WHERE identifier = ${user}`, function (error, results) {
        const playerID = results?.[0]?.player_id;
        if (error || !playerID) return msg.channel.send(errMsg);

        pool.query(`SELECT * FROM ranksync.player WHERE id = ${playerID}`, async function (error, results) {
          if (error) return msg.channel.send(errMsg);
          const id = results[0]?.uuid;

          return information(id, pool, member, user1, msg);
        });
      });
    }
  }
}

const information = async function (id, pool, member, user1, msg) {
  const em = new DiscordJS.MessageEmbed()
    .setTitle('Account Not Found')
    .setColor('FF0000')
    .setDescription(`An account with the name \`${user1}\` was not found.`);

  const { body } = await Nfetch
    .get(`https://api.mojang.com/user/profiles/${id}/names`)
    .catch(() => {
      return msg.channel.send(em);
    });
  if (!body) return msg.channel.send(em);
  const nc = JSONPath({ path: '*.name', json: body }).join(', ');
  const name = nc.slice(nc.lastIndexOf(',') + 1);

  pool.query(`SELECT * FROM chatreaction.survival_newreactionstats WHERE uuid = '${id}'`, function (error, results) {
    const wins = error ? results?.[0]?.wins : false;

    pool.query(`SELECT * FROM friends.fr_players WHERE player_uuid = '${id}'`, function (error, results) {
      const lastOnline = error ? false : results?.[0]?.last_online.toString() || false;

      pool.query(`SELECT SUM(session_end - session_start) FROM plan.plan_sessions WHERE uuid = '${id}'`, async function (error, results) {
        let out;
        if (error) {
          out = '0s';
        } else {
          const sum = results?.[0]['SUM(session_end - session_start)'];
          out = moment.duration(sum).format('hh[h] mm[m] s[s]');
        }

        pool.query(`SELECT double_value FROM plan.plan_extension_user_values WHERE provider_id = 15 AND uuid = '${id}'`, function (error, results) {
          const bal = error ? 0 : results?.[0]?.double_value || 0;

          const em = new DiscordJS.MessageEmbed()
            .setTitle(`${name}'s Account Information`)
            .setColor('00FF00')
            .setImage(`https://mc-heads.net/body/${id}`)
            .addField('Name Changes History', nc || 'Error fetching data...', false)
            .addField('UUID', id, false)
            .addField('NameMC Link', `Click [here](https://es.namemc.com/profile/${id}) to go to their NameMC Profile`, false);
          if (member) em.addField('Discord', `${user1.user.tag} (${user1.id})`, false);
          if (wins) em.addField('Reaction Wins', wins, false);
          if (lastOnline) em.addField('Last Online', lastOnline, false);
          if (out !== '0s') em.addField('Play Time', out, false);
          if (bal) em.addField('Survival Balance', `$${bal.toLocaleString()}`, false);

          return msg.channel.send(em);
        });
      });
    });
  });
};

module.exports = playerinfo;
