const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class ResetMoney extends Command {
  constructor (client) {
    super(client, {
      name: 'reset-money',
      description: 'Reset money of you or another member',
      category: 'Economy',
      usage: 'Reset-Money <user>',
      aliases: ['resetmoney', 'rm'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    const member = msg.member;
    const p = msg.settings.prefix;
    let mem;

    if (!member.permissions.has('MANAGE_GUILD')) return msg.channel.send('You are missing **Manage Guild** permission.');

    const filter = (response) => {
      return response.content.toLowerCase() === ('yes' || 'no' || 'y' || 'n') && response.author.id === msg.author.id;
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
            const amount = db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
            db.set(`servers.${msg.guild.id}.users.${member.id}.economy.cash`, amount);
            db.set(`servers.${msg.guild.id}.users.${member.id}.economy.bank`, 0);
            return msg.channel.send('Your money has been reset.');
          } else if (word === 'no' || word === 'n') {
            return msg.channel.send('Cancelled, your money will not be reset.');
          } else {
            return msg.channel.send({ embeds: [errEm] });
          }
        })
        .catch(err => {
          return msg.channel.send(err);
        });
    } else {
      mem = getMember(msg, text.join(' '));

      if (!mem) {
        const fid = text.join(' ').replace('<@', '').replace('>', '');
        try {
          mem = await this.client.users.fetch(fid);
        } catch (err) {
          const embed = new DiscordJS.MessageEmbed()
            .setColor('#EC5454')
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(`That user was not found. \nUsage: ${p}Reset-Money <user>`);
          return msg.channel.send({ embeds: [embed] });
        }
      }

      await msg.channel.send(`Are you sure you want to reset ${mem.user?.tag || mem.tag}'s money? (yes/no)`);
      msg.channel.awaitMessages(filter, {
        max: 1,
        time: 30000,
        errors: ['time']
      })
        .then((collected) => {
          const word = collected.first().content.trim();
          if (word === 'yes' || word === 'y') {
            const amount = db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;
            db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`, amount);
            db.set(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`, 0);
            return msg.channel.send(`Successfully reset ${mem.user?.tag || mem.tag}'s money.`);
          } else if (word === 'no' || word === 'n') {
            return msg.channel.send(`Cancelled, ${mem.user?.tag || mem.tag}'s money won't be reset.`);
          } else {
            return msg.channel.send({ embeds: [errEm] });
          }
        })
        .catch(err => {
          return msg.channel.send(err);
        });
    }
  }
}

module.exports = ResetMoney;
