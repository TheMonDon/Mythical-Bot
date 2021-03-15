/* eslint-disable no-unreachable */
const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

module.exports = class setFailRate extends Command {
  constructor (client) {
    super(client, {
      name: 'set-fail-rate',
      category: 'Economy',
      description: 'Sets the fail rate of economy commands',
      usage: 'set-fail-rate <crime> <amount>',
      guildOnly: true
    });
  }

  run (msg, text) {
    return msg.channel.send('This is not done.');
    const server = msg.guild;

    const types = ['work', 'crime'];

    if (!msg.member.permissions.has('MANAGE_GUILD')) return msg.channel.send('You are missing **Manage Guild** permission.');

    const cs = db.get(`servers.${server.id}.economy.symbol`) || '$';
    const usage = `${msg.settings.prefix}Set-Payout <work | crime> <min | max> <amount>`;

    const workMin = db.get(`servers.${server.id}.economy.work.min`) || 50;
    const workMax = db.get(`servers.${server.id}.economy.work.max`) || 500;
    // const slut_min = '';
    // const slut_max = '';
    const crimeMin = db.get(`servers.${server.id}.economy.crime.min`) || 500;
    const crimeMax = db.get(`servers.${server.id}.economy.crime.max`) || 2000;

    if (!text || text.length < 1) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#04ACF4')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(stripIndents`
        The current payout ranges are: 
        
        \`Work\` - min: ${cs}${workMin} | max: ${cs}${workMax}
        \`Crime\` - min: ${cs}${crimeMin} | max: ${cs}${crimeMax}
    
        Usage: ${usage}
        `);
      return msg.channel.send(embed);
    } else {
      const type = text[0]?.toLowerCase();
      if (!types.includes(type)) {
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#EC5454')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send(embed);
      }

      const minMax = text[1]?.toLowerCase();
      if (!['min', 'max'].includes(minMax)) {
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#EC5454')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send(embed);
      }

      text.shift();
      text.shift();
      const amount = parseInt(text.join('').replace(/,/g, '').replace(cs, '').replace(/-/g, ''));

      if (isNaN(amount)) {
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#EC5454')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(stripIndents`
            :x: Invalid payout. Please provide a valid number.

            Usage: ${usage}
            `);

        return msg.channel.send(embed);
      }

      if (amount > 1000000000000) {
        return msg.channel.send('The max amount for payout is one trillion.');
      } else if (amount < 1) {
        return msg.channel.send('The min amount for payout is one.');
      }

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#64BC6C')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL());

      if (type === 'work') {
        if (minMax === 'min') {
          db.set(`servers.${server.id}.economy.work.min`, amount);
          embed.setDescription(`The minimum amount for \`Work\` has been changed to ${cs}${amount}`);
        } else {
          db.set(`servers.${server.id}.economy.work.max`, amount);
          embed.setDescription(`The maximum amount for \`Work\` has been changed to ${cs}${amount}`);
        }

        return msg.channel.send(embed);
      } else if (type === 'crime') {
        if (minMax === 'min') {
          db.set(`servers.${server.id}.economy.crime.min`, amount);
          embed.setDescription(`The minimum amount for \`Crime\` has been changed to ${cs}${amount}`);
        } else {
          db.set(`servers.${server.id}.economy.crime.max`, amount);
          embed.setDescription(`The maximum amount for \`Crime\` has been changed to ${cs}${amount}`);
        }

        return msg.channel.send(embed);
      }
    }
  }
};