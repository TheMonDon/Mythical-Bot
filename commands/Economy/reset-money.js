const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class ResetMoney extends Command {
  constructor (client) {
    super(client, {
      name: 'reset-money',
      description: 'Reset money of you or another member',
      category: 'Economy',
      examples: ['reset-money <user>'],
      aliases: ['resetmoney', 'rm'],
      guildOnly: true
    });    
  }

  async run (msg, text) {
    const member = msg.member;
    const server = msg.guild;
    let mem;
    const p = msg.settings.prefix;

    if (!member.permissions.has('MANAGE_GUILD')) {
      return msg.channel.send('You are missing **Manage Guild** permission.');
    }

    const filter = (response) => {
      return response.content.toLowerCase() === 'yes' || 'no' || 'y' || 'n' && response.author.id === msg.author.id;
    };

    const errEm = new DiscordJS.MessageEmbed()
      .setColor('#EC5454')
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setDescription(`Incorrect Usage: ${p}Reset-Money <user>`);

    if (!text || text.length < 1) {
      await msg.channel.send('Are you sure you want to reset your money? (yes/no)');
      msg.channel.awaitMessages(filter, {
        max: 1,
        time: 30000,
        errors: ['time']
      })
        .then((collected) => {
          const word = collected.first().content.trim();
          if (word === 'yes' || word === 'y') {
            db.set(`servers.${server.id}.users.${member.id}.economy.cash`, 0);
            db.set(`servers.${server.id}.users.${member.id}.economy.bank`, 0);
            return msg.channel.send('Your money has been reset.');
          } else if (word === 'no' || word === 'n') {
            return msg.channel.send('Cancelled, your money will not be reset.');
          } else {
            return msg.channel.send(errEm);
          }
        })
        .catch(err => {
          return msg.channel.send(err);
        });
    } else {
      mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text.join(' ')}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text.join(' ').toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text.join(' ').toLowerCase()}`)) || server.members.cache.find(m => m.user.tag === `${text[0]}`);

      if (!mem) {
        const f_id = text.join(' ').replace('<@', '').replace('>', '');
        try {
          mem = await client.users.fetch(f_id);
        } catch (err) {
          const embed = new DiscordJS.MessageEmbed()
            .setColor('#EC5454')
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(`That user was not found. \nUsage: ${p}Reset-Money <user>`);
          return msg.channel.send(embed);
        }
      }

      await msg.channel.send(`Are you sure you want to reset ${mem.user && mem.user.tag || mem.tag}'s money? (yes/no)`);
      msg.channel.awaitMessages(filter, {
        max: 1,
        time: 30000,
        errors: ['time']
      })
        .then((collected) => {
          const word = collected.first().content.trim();
          if (word === 'yes' || word === 'y') {
            db.set(`servers.${server.id}.users.${mem.id}.economy.cash`, 0);
            db.set(`servers.${server.id}.users.${mem.id}.economy.bank`, 0);
            return msg.channel.send(`Successfully reset ${mem.user && mem.user.tag || mem.tag}'s money.`);
          } else if (word === 'no' || word === 'n') {
            return msg.channel.send(`Cancelled, ${mem.user && mem.user.tag || mem.tag}'s money won't be reset.`);
          } else {
            return msg.channel.send(errEm);
          }
        })
        .catch(err => {
          return msg.channel.send(err);
        });
    }

  }
};