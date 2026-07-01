import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get detailed information about a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to inspect (defaults to you)")
    ),

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction);

      if (!deferSuccess) {
        logger.warn(`UserInfo interaction defer failed`, {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          commandName: 'userinfo'
        });
        return;
      }

      const user = interaction.options.getUser("target") || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);

      const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);
      const joinedTimestamp = member?.joinedAt
        ? Math.floor(member.joinedAt.getTime() / 1000)
        : null;

      // Only allow company rank roles
      const isCompanyRank = (roleName) => {
        return (
          /^\d+\s*\|/.test(roleName) ||     // e.g. 255 | Chairman
          roleName.startsWith("HO |") ||    // HO | Head Office
          roleName.startsWith("BOA |")      // BOA | Board Of Directors
        );
      };

      // Find the highest company rank based on Discord role hierarchy
      const highestCompanyRole = member?.roles.cache
        .filter(role => isCompanyRank(role.name))
        .sort((a, b) => b.position - a.position)
        .first();

      const embed = createEmbed({
        title: `User Info: ${user.username}`
      })
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          {
            name: "ID",
            value: user.id,
            inline: true,
          },
          {
            name: "Bot",
            value: user.bot ? "Yes" : "No",
            inline: true,
          },
          {
            name: "Roles",
            value:
              member && member.roles.cache.size > 1
                ? member.roles.cache
                    .filter(role => role.name !== "@everyone")
                    .map(role => role.name)
                    .join(", ")
                : "None",
            inline: false,
          },
          {
            name: "Account Created",
            value: `<t:${createdTimestamp}:R>`,
            inline: false,
          },
          {
            name: "Joined Server",
            value: joinedTimestamp
              ? `<t:${joinedTimestamp}:R>`
              : "Not in server",
            inline: false,
          },
          {
            name: "Highest Role",
            value: highestCompanyRole?.name || "None",
            inline: true,
          },
        );

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed],
      });

      logger.info(`UserInfo command executed`, {
        userId: interaction.user.id,
        targetUserId: user.id,
        guildId: interaction.guildId,
      });

    } catch (error) {
      logger.error(`UserInfo command execution failed`, {
        error: error.message,
        stack: error.stack,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'userinfo'
      });

      await handleInteractionError(interaction, error, {
        commandName: 'userinfo',
        source: 'userinfo_command'
      });
    }
  },
};
