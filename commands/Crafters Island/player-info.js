const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
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
      category: 'Crafters Island',
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

    let member = Boolean(msg.guild.members.members.cache.get(user));

    const errMsg = 'I could not find that user. Did they sync their accounts using `!link`? \nAdd "" around mc username if their discord name is the same.';

    const information = async function (id, pool, member, user1, msg) {
      const em = new DiscordJS.EmbedBuilder()
        .setTitle('Account Not Found')
        .setColor('FF0000')
        .setDescription(`An account with the name \`${user1}\` was not found.`);

      const { body } = await Nfetch
        .get(`https://api.mojang.com/user/profiles/${id}/names`)
        .catch(() => {
          return msg.channel.send({ embeds: [em] });
        });
      if (!body) return msg.channel.send({ embeds: [em] });
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

              const em = new DiscordJS.EmbedBuilder()
                .setTitle(`${name}'s Account Information`)
                .setColor('00FF00')
                .setImage(`https://mc-heads.net/body/${id}`)
                .addFields([
                  { name: 'Name Changes History', value: nc || 'Error fetching data...' },
                  { name: 'UUID', value: id },
                  { name: 'NameMC Link', value: `Click [here](https://es.namemc.com/profile/${id}) to go to their NameMC Profile` }
                ]);
              if (member) em.addFields([{ name: 'Discord', value: `${user1.user.tag} (${user1.id})` }]);
              if (wins) em.addFields([{ name: 'Reaction Wins', value: wins }]);
              if (lastOnline) em.addFields([{ name: 'Last Online', value: lastOnline }]);
              if (out !== '0s') em.addFields([{ name: 'Play Time', value: out }]);
              if (bal) em.addFields([{ name: 'Survival Balance', value: `$${bal.toLocaleString()}` }]);

              return msg.channel.send({ embeds: [em] });
            });
          });
        });
      });
    };

    const errorEmbed = new DiscordJS.EmbedBuilder()
      .setTitle('Account Not Found')
      .setColor('FF0000')
      .setDescription(`An account with the name \`${user || user1}\` was not found.`);

    if (!member) {
      const nameRegex = /^\w{3,16}$/;
      // Make sure the username is a valid MC username
      if (!nameRegex.test(user)) {
        const em = new DiscordJS.EmbedBuilder()
          .setTitle('Invalid Username')
          .setColor('FF0000')
          .setDescription(`\`${user}\` is not a valid username.`);
        console.log(user);
        return msg.channel.send({ embeds: [em] });
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
          if (user && msg.guild.members.members.cache.get(user)) {
            member = true;
            user1 = msg.guild.members.members.cache.get(user);
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

module.exports = playerinfo;
