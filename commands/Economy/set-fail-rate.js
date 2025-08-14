const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

class SetFailRate extends Command {
  constructor(client) {
    super(client, {
      name: 'set-fail-rate',
      category: 'Economy',
      description: 'Sets the fail rate of economy commands',
      usage: 'set-fail-rate <crime | slut> <percentage>',
      aliases: ['setfailrate', 'setfail'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();
    const types = ['crime', 'slut'];

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    if (!args || args.length < 1) {
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

      const slutFail = economyRows[0]?.slut_fail_rate || 35;
      const crimeFail = economyRows[0]?.crime_fail_rate || 45;

      embed.setColor(msg.settings.embedColor).setDescription(stripIndents`
        The current fail rates are: 
        
        \`Crime\` - ${crimeFail}%
        \`Slut\`  - ${slutFail}%
    
        Usage: ${this.help.usage}
        `);

      connection.release();
      return msg.channel.send({ embeds: [embed] });
    }

    const type = args[0]?.toLowerCase();
    if (!types.includes(type)) {
      connection.release();
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    args.shift();
    const percentage = parseInt(args.join('').replace('%', '').replace(/-/g, ''), 10);

    if (isNaN(percentage)) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'Please provide a valid number.', 'Invalid Fail Rate');
    } else if (percentage > 100) {
      connection.release();
      return this.client.util.errorEmbed(msg, "The percentage can't be greater than 100%.", 'Invalid Fail Rate');
    } else if (percentage < 0) {
      connection.release();
      return this.client.util.errorEmbed(msg, "The percentage can't be less than 0%.", 'Invalid Fail Rate');
    }

    if (type === 'crime') {
      await connection.execute(
        /* sql */ `
          INSERT INTO
            economy_settings (guild_id, crime_fail_rate)
          VALUES
            (?, ?) ON DUPLICATE KEY
          UPDATE crime_fail_rate =
          VALUES
            (crime_fail_rate)
        `,
        [msg.guild.id, percentage],
      );
      embed.setDescription(`The fail rate for \`Crime\` has been set to ${percentage}%.`);

      return msg.channel.send({ embeds: [embed] });
    } else if (type === 'slut') {
      await connection.execute(
        /* sql */ `
          INSERT INTO
            economy_settings (guild_id, slut_fail_rate)
          VALUES
            (?, ?) ON DUPLICATE KEY
          UPDATE slut_fail_rate =
          VALUES
            (slut_fail_rate)
        `,
        [msg.guild.id, percentage],
      );
      embed.setDescription(`The fail rate for \`Slut\` has been set to ${percentage}%.`);
    }

    connection.release();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetFailRate;
