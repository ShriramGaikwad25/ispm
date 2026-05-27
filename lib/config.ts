import appConfig from "@/config.json";

export const tenantId = appConfig.tenantId;

// Application configuration
export const config = {
  tenantId,
  api: {
    endpoints: {
      jobs: `https://preview.keyforge.ai/kfscheduler/api/v1/${tenantId}/jobs`,
    },
  },
};
