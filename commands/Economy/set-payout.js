const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

class SetPayout extends Command {
  constructor (client) {
    super(client, {
      name: 'set-payout',
      category: 'Economy',
      description: 'Sets the payout of the economy commands',
      usage: 'set-payout <work | crime> <min | max> <amount>',
      aliases: ['setpayout', 'sp'],
      guildOnly: true
    });
  }

  run (msg, text) {
    const types = ['work', 'crime'];

    if (!msg.member.permissions.has('MANAGE_GUILD')) return msg.channel.send('You are missing **Manage Guild** permission.');

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const usage = `${msg.settings.prefix}set-payout <work | crime> <min | max> <amount>`;

    const workMin = db.get(`servers.${msg.guild.id}.economy.work.min`) || 50;
    const workMax = db.get(`servers.${msg.guild.id}.economy.work.max`) || 500;
    // const slut_min = db.get(`servers.${msg.guild.id}.economy.slut.min`) || 100;
    // const slut_max = db.get(`servers.${msg.guild.id}.economy.work.max`) || 1000;
    const crimeMin = db.get(`servers.${msg.guild.id}.economy.crime.min`) || 500;
    const crimeMax = db.get(`servers.${msg.guild.id}.economy.crime.max`) || 2000;

    if (!text || text.length < 1) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#04ACF4')
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(stripIndents`
          The current payout ranges are: 
        
          \`Work\` - min: ${cs}${workMin} | max: ${cs}${workMax}
          \`Crime\` - min: ${cs}${crimeMin} | max: ${cs}${crimeMax}
    
          Usage: ${usage}
        `);
      return msg.channel.send({ embeds: [embed] });
    }
    const errEmbed = new DiscordJS.MessageEmbed()
      .setColor('#EC5454')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    const type = text[0]?.toLowerCase();
    if (!types.includes(type)) {
      errEmbed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    const minMax = text[1]?.toLowerCase();
    if (!['min', 'max'].includes(minMax)) {
      errEmbed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    text.shift();
    text.shift();
    const amount = parseInt(text.join('').replace(/,/g, '').replace(cs, '').replace(/-/g, ''), 10);

    if (isNaN(amount)) {
      errEmbed.setDescription(stripIndents`
        :x: Invalid payout. Please provide a valid number.

        Usage: ${usage}
      `);

      return msg.channel.send({ embeds: [errEmbed] });
    }

    if (amount > 1000000000000) {
      return msg.channel.send('The max amount for payout is one trillion.');
    } else if (amount < 1) {
      return msg.channel.send('The min amount for payout is one.');
    }

    const embed = new DiscordJS.MessageEmbed()
      .setColor('#64BC6C')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (type === 'work') {
      if (minMax === 'min') {
        db.set(`servers.${msg.guild.id}.economy.work.min`, amount);
        embed.setDescription(`The minimum amount for \`Work\` has been changed to ${cs}${amount}`);
      } else {
        db.set(`servers.${msg.guild.id}.economy.work.max`, amount);
        embed.setDescription(`The maximum amount for \`Work\` has been changed to ${cs}${amount}`);
      }
    } else if (type === 'crime') {
      if (minMax === 'min') {
        db.set(`servers.${msg.guild.id}.economy.crime.min`, amount);
        embed.setDescription(`The minimum amount for \`Crime\` has been changed to ${cs}${amount}`);
      } else {
        db.set(`servers.${msg.guild.id}.economy.crime.max`, amount);
        embed.setDescription(`The maximum amount for \`Crime\` has been changed to ${cs}${amount}`);
      }
    } else if (type === 'slut') { // Shoved this in for future proofing :D
      if (minMax === 'min') {
        db.set(`servers.${msg.guild.id}.economy.slut.min`, amount);
        embed.setDescription(`The minimum amount for \`Slut\` has been changed to ${cs}${amount}`);
      } else {
        db.set(`servers.${msg.guild.id}.economy.slut.max`, amount);
        embed.setDescription(`The maximum amount for \`Slut\` has been changed to ${cs}${amount}`);
      }
    }

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetPayout;
