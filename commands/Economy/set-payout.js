const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class SetPayout extends Command {
  constructor(client) {
    super(client, {
      name: 'set-payout',
      category: 'Economy',
      description: 'Sets the payout of the economy commands',
      usage: 'set-payout <work | crime | slut> <min | max> <amount>',
      aliases: ['setpayout'],
      guildOnly: true,
    });
  }

  run(msg, text) {
    const types = ['work', 'crime', 'slut'];

    if (!msg.member.permissions.has('ManageMessages'))
      return msg.channel.send('You are missing **Manage Guild** permission.');

    const currencySymbol = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const usage = `${msg.settings.prefix}set-payout <work | crime> <min | max> <amount>`;

    const workMin = db.get(`servers.${msg.guild.id}.economy.work.min`) || 50;
    const workMax = db.get(`servers.${msg.guild.id}.economy.work.max`) || 500;
    const slutMin = db.get(`servers.${msg.guild.id}.economy.slut.min`) || 100;
    const slutMax = db.get(`servers.${msg.guild.id}.economy.work.max`) || 1000;
    const crimeMin = db.get(`servers.${msg.guild.id}.economy.crime.min`) || 500;
    const crimeMax = db.get(`servers.${msg.guild.id}.economy.crime.max`) || 2000;

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    if (!text || text.length < 1) {
      embed.setColor('#04ACF4').setDescription(stripIndents`
          The current payout ranges are: 
        
          \`Work\`  - min: ${currencySymbol}${workMin}  | max: ${currencySymbol}${workMax}
          \`Crime\` - min: ${currencySymbol}${crimeMin} | max: ${currencySymbol}${crimeMax}
          \`Slut\`  - min: ${currencySymbol}${slutMin}  | max: ${currencySymbol}${slutMax}
    
          Usage: ${usage}
        `);
      return msg.channel.send({ embeds: [embed] });
    }

    const type = text[0]?.toLowerCase();
    if (!types.includes(type)) {
      embed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [embed] });
    }

    const minMax = text[1]?.toLowerCase();
    if (!['min', 'max'].includes(minMax)) {
      embed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [embed] });
    }

    text.shift();
    text.shift();
    const amount = parseInt(text.join('').replace(/,/g, '').replace(currencySymbol, '').replace(/-/g, ''), 10);

    if (isNaN(amount)) {
      embed.setDescription(stripIndents`
        :x: Invalid payout. Please provide a valid number.

        Usage: ${usage}
      `);

      return msg.channel.send({ embeds: [embed] });
    }

    if (amount > 1000000000000) {
      return msg.channel.send('The max amount for payout is one trillion.');
    } else if (amount < 1) {
      return msg.channel.send('The min amount for payout is one.');
    }

    embed.setColor('#64BC6C');

    if (type === 'work') {
      if (minMax === 'min') {
        db.set(`servers.${msg.guild.id}.economy.work.min`, amount);
        embed.setDescription(`The minimum amount for \`Work\` has been changed to ${currencySymbol}${amount}`);
      } else {
        db.set(`servers.${msg.guild.id}.economy.work.max`, amount);
        embed.setDescription(`The maximum amount for \`Work\` has been changed to ${currencySymbol}${amount}`);
      }
    } else if (type === 'crime') {
      if (minMax === 'min') {
        db.set(`servers.${msg.guild.id}.economy.crime.min`, amount);
        embed.setDescription(`The minimum amount for \`Crime\` has been changed to ${currencySymbol}${amount}`);
      } else {
        db.set(`servers.${msg.guild.id}.economy.crime.max`, amount);
        embed.setDescription(`The maximum amount for \`Crime\` has been changed to ${currencySymbol}${amount}`);
      }
    } else if (type === 'slut') {
      // Shoved this in for future proofing :D (Thanks past me!)
      if (minMax === 'min') {
        db.set(`servers.${msg.guild.id}.economy.slut.min`, amount);
        embed.setDescription(`The minimum amount for \`Slut\` has been changed to ${currencySymbol}${amount}`);
      } else {
        db.set(`servers.${msg.guild.id}.economy.slut.max`, amount);
        embed.setDescription(`The maximum amount for \`Slut\` has been changed to ${currencySymbol}${amount}`);
      }
    }

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetPayout;
