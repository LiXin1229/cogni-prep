<script setup lang="ts">
import SelectAreaDialog from './SelectAreaDialog.vue'
import SelectPointDialog from './SelectPointDialog.vue'
import DeleteChatDialog from './DeleteChatDialog.vue'
import DeleteSessionDialog from './DeleteSessionDialog.vue'
import UserAddNode from './UserAddNode.vue'
import AiAddNode from './AIAddNode.vue'
import EditNode from './EditNode.vue'
import DeleteNode from './DeleteNode.vue'
import DeleteChildren from './DeleteChildren.vue'
import QuoteMindmap from './QuoteMindmap.vue'
import LogoutDialog from './LogoutDialog.vue'

import { useUserInfoStore } from '@/stores/user'
import type { SessionType } from '@/stores/types/session.type'

const userStore = useUserInfoStore()

defineProps<{
  selectSession: SessionType | null
}>()
</script>

<template>
  <select-area-dialog :show-dialog="userStore.showDialog === 'selectArea'" />
  <select-point-dialog :show-dialog="userStore.showDialog === 'selectPoint'" />
  <delete-chat-dialog :show-dialog="userStore.showDialog === 'deleteChat'" />
  <delete-session-dialog
    :show-dialog="userStore.showDialog === 'deleteSession'"
    :select-session="selectSession"
  />
  <user-add-node :show-dialog="userStore.showDialog === 'userAddNode'" />
  <ai-add-node :show-dialog="userStore.showDialog === 'aiAddNode'" />
  <edit-node :show-dialog="userStore.showDialog === 'editNode'" />
  <delete-node :show-dialog="userStore.showDialog === 'deleteNode'" />
  <delete-children :show-dialog="userStore.showDialog === 'deleteChildren'" />
  <quote-mindmap :show-dialog="userStore.showDialog === 'quoteMindmap'" />
  <logout-dialog :show-dialog="userStore.showDialog === 'logout'" />
</template>
