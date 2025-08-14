const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

class SetPayout extends Command {
  constructor(client) {
    super(client, {
      name: 'set-payout',
      category: 'Economy',
      description: 'Sets the payout of the economy system',
      usage: 'set-payout <work | crime | slut | chat> <min | max> [amount]',
      aliases: ['setpayout'],
      examples: ['set-payout work min 100', 'set-payout crime max 170000', 'set-payout chat min'],
      longDescription: 'By using the command without an amount it will reset the amount to default',
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();
    const types = ['work', 'crime', 'slut', 'chat'];

    const [economyRows] = await connection.execute(
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
    const currencySymbol = economyRows[0]?.symbol || '$';

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    if (!args || args.length < 1) {
      const workMin = economyRows[0]?.work_min || 20;
      const workMax = economyRows[0]?.work_max || 250;
      const slutMin = economyRows[0]?.slut_min || 100;
      const slutMax = economyRows[0]?.slut_max || 400;
      const crimeMin = economyRows[0]?.crime_min || 250;
      const crimeMax = economyRows[0]?.crime_max || 700;
      const chatMin = economyRows[0]?.chat_min || 10;
      const chatMax = economyRows[0]?.chat_max || 100;

      embed.setColor(msg.settings.embedColor).setDescription(stripIndents`
          The current payout ranges are: 
        
          \`Work\`  - min: ${currencySymbol}${workMin.toLocaleString()}  | max: ${currencySymbol}${workMax.toLocaleString()}
          \`Crime\` - min: ${currencySymbol}${crimeMin.toLocaleString()} | max: ${currencySymbol}${crimeMax.toLocaleString()}
          \`Slut\`  - min: ${currencySymbol}${slutMin.toLocaleString()}  | max: ${currencySymbol}${slutMax.toLocaleString()}
          \`Chat\`  - min: ${currencySymbol}${chatMin.toLocaleString()}  | max: ${currencySymbol}${chatMax.toLocaleString()}
    
          Usage: ${msg.settings.prefix + this.help.usage}
        `);

      connection.release();
      return msg.channel.send({ embeds: [embed] });
    }

    const type = args[0]?.toLowerCase();
    if (!types.includes(type)) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    const minMax = args[1]?.toLowerCase();
    if (!['min', 'max'].includes(minMax)) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }
    const longMinMax = minMax === 'min' ? 'minimum' : 'maximum';

    args.shift();
    args.shift();
    const amount = parseInt(
      args
        .join('')
        .replace(/[^0-9\\.]/g, '')
        .replace(/-/g, ''),
    );

    if (!amount) {
      await connection.execute(
        /* sql */ `
          UPDATE economy_settings
          SET
            ${type}_${minMax} = DEFAULT
          WHERE
            guild_id = ?
        `,
        [msg.guild.id],
      );

      embed.setDescription(`The ${longMinMax} amount for \`${this.client.util.toProperCase(type)}\` has been reset.`);

      connection.release();
      return msg.channel.send({ embeds: [embed] });
    }

    if (isNaN(amount)) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'Please provide a valid number', 'Invalid Payout');
    }

    if (amount > 1000000000000) {
      connection.release();
      return msg.channel.send('The maximum amount for payout is one trillion.');
    } else if (amount < 1) {
      connection.release();
      return msg.channel.send('The minimum amount for payout is one.');
    }

    await connection.execute(
      /* sql */ `
        UPDATE economy_settings
        SET
          ${type}_${minMax} = ?
        WHERE
          guild_id = ?
      `,
      [amount, msg.guild.id],
    );

    const amountString = currencySymbol + amount.toLocaleString();

    embed.setDescription(
      `The ${longMinMax} amount for \`${this.client.util.toProperCase(
        type,
      )}\` has been changed to ${this.client.util.limitStringLength(amountString, 0, 1024)}`,
    );

    connection.release();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetPayout;
