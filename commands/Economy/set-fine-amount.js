const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

class SetFineAmount extends Command {
  constructor(client) {
    super(client, {
      name: 'set-fine-amount',
      category: 'Economy',
      description: 'Sets the fine amount of the economy commands',
      longDescription: `The minimum and maximum fine amounts for the economy commands can be set with this command. The fine amounts can be set for \`crime\`, \`slut\`, and \`rob\`. If no arguments are provided, the current fine amounts will be displayed. If no amount is provided, the fine amount will be reset to the default value.`,
      usage: 'set-fine-amount <crime | slut | rob> <min | max> <amount>',
      aliases: ['setfine', 'setfineamount'],
      examples: ['set-fine-amount', 'set-fine-amount slut min 10', 'set-fine-amount crime max 30'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();
    const types = ['crime', 'slut', 'rob'];

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    if (!args || args.length < 1) {
      const [fineRows] = await connection.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_settings
          WHERE
            guild_id = ?
        `,
        [msg.guild.id],
      );

      const crimeMin = fineRows[0]?.crime_fine_min || 10;
      const crimeMax = fineRows[0]?.crime_fine_max || 40;
      const slutMin = fineRows[0]?.slut_fine_min || 10;
      const slutMax = fineRows[0]?.slut_fine_max || 20;
      const robMin = fineRows[0]?.rob_fine_min || 10;
      const robMax = fineRows[0]?.rob_fine_max || 30;

      embed.setColor(msg.settings.embedColor).setDescription(stripIndents`
          The current fine ranges are: 
        
          \`Crime\` - min: ${crimeMin}% | max: ${crimeMax}%
          \`Slut\` - min: ${slutMin}% | max: ${slutMax}%
          \`Rob\` - min: ${robMin}% | max: ${robMax}%
    
          Usage: ${msg.settings.prefix + this.help.usage}
        `);

      connection.release();
      return msg.channel.send({ embeds: [embed] });
    }

    // Check if args[0] is inside types
    const type = args[0]?.toLowerCase();
    if (!types.includes(type)) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    // Check if min or max is inside args[1]
    const minMax = args[1]?.toLowerCase();
    if (!['min', 'max'].includes(minMax)) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    args.shift();
    args.shift();
    const amount = args
      .join('')
      .replace(/[^0-9].*/, '')
      .replace(/[^0-9]/g, '');

    const longMinMax = minMax === 'min' ? 'minimum' : 'maximum';

    if (!amount) {
      await connection.execute(
        /* sql */ `
          UPDATE economy_settings
          SET
            ${type}_fine_${minMax} = DEFAULT
          WHERE
            guild_id = ?
        `,
        [msg.guild.id],
      );
      connection.release();

      embed
        .setDescription(`The ${longMinMax} amount for \`${this.client.util.toProperCase(type)}\` has been reset.`)
        .setColor(msg.settings.embedSuccessColor);

      return msg.channel.send({ embeds: [embed] });
    }

    if (isNaN(amount)) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'Please provide a valid number', 'Invalid Fine Amount');
    }

    if (amount > 100) {
      connection.release();
      return msg.channel.send('The maximum fine amount is one hundred percent.');
    } else if (amount < 1) {
      connection.release();
      return msg.channel.send('The minimum fine amount is one percent.');
    }

    await connection.execute(
      /* sql */ `
        INSERT INTO
          economy_settings (
            guild_id,
            ${type}_fine_${minMax}
          )
        VALUES
          (?, ?) ON DUPLICATE KEY
        UPDATE ${type}_fine_${minMax} =
        VALUES
          (
            ${type}_fine_${minMax}
          )
      `,
      [msg.guild.id, amount],
    );

    embed.setDescription(
      `The ${longMinMax} amount for \`${this.client.util.toProperCase(type)}\` has been changed to ${amount}%`,
    );

    connection.release();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetFineAmount;
