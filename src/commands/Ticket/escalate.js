import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getTicketPermissionContext } from '../../utils/ticketPermissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName("escalate")
    .setDescription("Escalates the current ticket to the moderation department.")
    .setDMPermission(false),

  async execute(interaction, guildConfig, client) {
    try {
      const deferred = await InteractionHelper.safeDefer(interaction, {
        flags: MessageFlags.Ephemeral
      });
      if (!deferred) return;

      const permissionContext = await getTicketPermissionContext({ client, interaction });
      if (!permissionContext.ticketData) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'This command can only be used in a valid ticket channel.'
        });
      }

      if (!permissionContext.canManageTicket) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'You need the `Manage Channels` permission or the configured `Ticket Staff Role` to escalate tickets.'
        });
      }

      const channel = interaction.channel;
      const guild = interaction.guild;

      const supportRoleId = guildConfig?.supportRoleId || '1506631605576270004';
      const modRoleId = guildConfig?.modDepartmentRoleId || '1506843456943689798';
      const ticketCategoryId = guildConfig?.ticketCategoryId || '1506636010866479114';

      if (!channel || !guild) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'This command can only be used in a guild ticket channel.'
        });
      }

      const isTicketChannel =
        channel.parentId === ticketCategoryId ||
        channel.name?.toLowerCase().startsWith('ticket-');

      if (!isTicketChannel) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'This command can only be used in a valid ticket channel.'
        });
      }

      const supportRole = guild.roles.cache.get(supportRoleId);
      const modRole = guild.roles.cache.get(modRoleId);

      if (!supportRole) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'Support role not found.'
        });
      }

      if (!modRole) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'Moderation Department role not found.'
        });
      }

      const ticketData = permissionContext.ticketData;
      const claimedUserId =
        ticketData.claimedBy ||
        ticketData.claimedUserId ||
        ticketData.claimantId ||
        ticketData.claimed;

      if (claimedUserId) {
        const claimedOverwrite = channel.permissionOverwrites.cache.get(claimedUserId);
        if (claimedOverwrite) {
          await claimedOverwrite.delete('Ticket escalated and unclaimed');
        }
      }

      await channel.permissionOverwrites.edit(supportRole, {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false
      });

      await channel.permissionOverwrites.edit(modRole, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      const currentName = channel.name ?? 'ticket';
      const newName = currentName.endsWith('mod') ? currentName : `${currentName}mod`;

      if (newName !== currentName) {
        await channel.setName(newName, 'Escalated ticket to moderation department');
      }

      await channel.send({
        content: `<@&${modRole.id}>`,
        embeds: [
          successEmbed(
            'Ticket Escalated',
            'This ticket has been escalated to the moderation department.'
          )
        ]
      });

      await InteractionHelper.safeEditReply(interaction, {
        content: 'Ticket escalated successfully.'
      });

      logger.info('Ticket escalated successfully', {
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        channelId: channel.id,
        channelName: channel.name,
        claimedUserId: claimedUserId || null,
        guildId: interaction.guildId,
        commandName: 'escalate'
      });
    } catch (error) {
      logger.error('Error executing escalate command', {
        error: error.message,
        stack: error.stack,
        userId: interaction.user.id,
        channelId: interaction.channel?.id,
        guildId: interaction.guildId,
        commandName: 'escalate'
      });

      await handleInteractionError(interaction, error, {
        commandName: 'escalate',
        source: 'ticket_escalate_command'
      });
    }
  },
};
