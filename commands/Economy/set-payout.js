const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class SetPayout extends Command {
  constructor(client) {
    super(client, {
      name: 'set-payout',
      category: 'Economy',
      description: 'Sets the payout of the economy commands',
      usage: 'set-payout <work | crime | slut | chat> <min | max> [amount]',
      aliases: ['setpayout'],
      examples: ['set-payout work min 100', 'set-payout crime max 170000', 'set-payout chat min'],
      longDescription: 'By using the command without an amount it will reset the amount to default',
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const types = ['work', 'crime', 'slut', 'chat'];
    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    const workMin = (await db.get(`servers.${msg.guild.id}.economy.work.min`)) || 20;
    const workMax = (await db.get(`servers.${msg.guild.id}.economy.work.max`)) || 250;
    const slutMin = (await db.get(`servers.${msg.guild.id}.economy.slut.min`)) || 100;
    const slutMax = (await db.get(`servers.${msg.guild.id}.economy.slut.max`)) || 400;
    const crimeMin = (await db.get(`servers.${msg.guild.id}.economy.crime.min`)) || 250;
    const crimeMax = (await db.get(`servers.${msg.guild.id}.economy.crime.max`)) || 700;
    const chatMin = (await db.get(`servers.${msg.guild.id}.economy.chat.min`)) || 10;
    const chatMax = (await db.get(`servers.${msg.guild.id}.economy.chat.max`)) || 100;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    if (!args || args.length < 1) {
      embed.setColor(msg.settings.embedColor).setDescription(stripIndents`
          The current payout ranges are: 
        
          \`Work\`  - min: ${currencySymbol}${workMin}  | max: ${currencySymbol}${workMax}
          \`Crime\` - min: ${currencySymbol}${crimeMin} | max: ${currencySymbol}${crimeMax}
          \`Slut\`  - min: ${currencySymbol}${slutMin}  | max: ${currencySymbol}${slutMax}
          \`Chat\`  - min: ${currencySymbol}${chatMin}  | max: ${currencySymbol}${chatMax}
    
          Usage: ${msg.settings.prefix + this.help.usage}
        `);
      return msg.channel.send({ embeds: [embed] });
    }

    const type = args[0]?.toLowerCase();
    if (!types.includes(type)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    const minMax = args[1]?.toLowerCase();
    if (!['min', 'max'].includes(minMax)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }
    const longMinMax = minMax === 'min' ? 'minimum' : 'maximum';

    args.shift();
    args.shift();
    const amount = args
      .join('')
      .replace(/[^0-9\\.]/g, '')
      .replace(/-/g, '');

    if (!amount) {
      db.delete(`servers.${msg.guild.id}.economy.${type}.${minMax}`);
      embed
        .setDescription(`The ${longMinMax} amount for \`${this.client.util.toProperCase(type)}\` has been reset.`)
        .setColor(msg.settings.embedSuccessColor);
      return msg.channel.send({ embeds: [embed] });
    }

    if (isNaN(amount)) return this.client.util.errorEmbed(msg, 'Please provide a valid number', 'Invalid Payout');

    if (amount > 1000000000000) {
      return msg.channel.send('The maximum amount for payout is one trillion.');
    } else if (amount < 1) {
      return msg.channel.send('The minimum amount for payout is one.');
    }

    await db.set(`servers.${msg.guild.id}.economy.${type}.${minMax}`, amount);
    const amountString = currencySymbol + amount.toLocaleString();

    embed
      .setDescription(
        `The ${longMinMax} amount for \`${this.client.util.toProperCase(
          type,
        )}\` has been changed to ${this.client.util.limitStringLength(amountString, 0, 1024)}`,
      )
      .setColor(msg.settings.embedSuccessColor);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetPayout;
