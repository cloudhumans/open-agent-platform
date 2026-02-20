"use client";

import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useConfigStore } from "@/features/chat/hooks/use-config-store";
import { useRagContext } from "@/features/rag/providers/RAG";
import { Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import _ from "lodash";
import { cn } from "@/lib/utils";
import {
  ConfigurableFieldAgentsMetadata,
  ConfigurableFieldMCPMetadata,
  ConfigurableFieldRAGMetadata,
} from "@/types/configurable";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { useAgentsContext } from "@/providers/Agents";
import { getDeployments } from "@/lib/environment/deployments";
import { toast } from "sonner";
import { useAuthContext } from "@/providers/Auth";
import { useClaudiaTags } from "@/hooks/use-claudia-tags";
import { useTenantContext } from "@/providers/Tenant";

interface Option {
  label: string;
  value: string;
}

interface ConfigFieldProps {
  id: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "switch"
    | "slider"
    | "select"
    | "json"
    | "claudia_project"
    | "claudia_tag";
  description?: string;
  placeholder?: string;
  options?: Option[];
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  // Optional props for external state management
  value?: any;
  setValue?: (value: any) => void;
  agentId: string;
  dependencyValue?: string; // e.g. project name for resolving tags
}

export function ConfigField({
  id,
  label,
  type,
  description,
  placeholder,
  options = [],
  min,
  max,
  step = 1,
  className,
  value: externalValue, // Rename to avoid conflict
  setValue: externalSetValue, // Rename to avoid conflict
  agentId,
  dependencyValue,
}: ConfigFieldProps) {
  const store = useConfigStore();
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [openTag, setOpenTag] = useState(false);
  const { user } = useAuthContext();
  const { selectedTenant } = useTenantContext();
  const claudiaProjects = useMemo(() => {
    return (selectedTenant?.claudiaProjectIds ?? []).filter(Boolean);
  }, [selectedTenant]);
  const availableTags = useClaudiaTags(dependencyValue);

  // Determine whether to use external state or Zustand store
  const isExternallyManaged = externalSetValue !== undefined;

  const currentValue = isExternallyManaged
    ? externalValue
    : store.configsByAgentId[agentId][id];

  const handleChange = (newValue: any) => {
    setJsonError(null); // Clear JSON error on any change
    if (isExternallyManaged && externalSetValue) {
      externalSetValue(newValue); // Use non-null assertion as we checked existence
    } else {
      store.updateConfig(agentId, id, newValue);
    }
  };

  const handleJsonChange = (jsonString: string) => {
    try {
      if (!jsonString.trim()) {
        handleChange(undefined); // Use the unified handleChange
        setJsonError(null);
        return;
      }

      // Attempt to parse for validation first
      const parsedJson = JSON.parse(jsonString);
      // If parsing succeeds, call handleChange with the raw string and clear error
      handleChange(parsedJson); // Use the unified handleChange
      setJsonError(null);
    } catch (_) {
      // If parsing fails, update state with invalid string but set error
      // This allows the user to see their invalid input and the error message
      if (isExternallyManaged && externalSetValue) {
        externalSetValue(jsonString);
      } else {
        store.updateConfig(agentId, id, jsonString);
      }
      setJsonError("Invalid JSON format");
    }
  };

  const handleFormatJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      // Directly use handleChange to update with the formatted string
      handleChange(parsed);
      setJsonError(null); // Clear error on successful format
    } catch (_) {
      // If formatting fails (because input is not valid JSON), set the error state
      // Do not change the underlying value that failed to parse/format
      setJsonError("Invalid JSON format");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className="text-sm font-medium"
        >
          {_.startCase(label)}
        </Label>
        {type === "switch" && (
          <Switch
            id={id}
            checked={!!currentValue} // Use currentValue
            onCheckedChange={handleChange}
          />
        )}
      </div>

      {description && (
        <p className="text-xs whitespace-pre-line text-gray-500">
          {description}
        </p>
      )}

      {type === "text" && (
        <Input
          id={id}
          value={currentValue || ""} // Use currentValue
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
        />
      )}

      {type === "textarea" && (
        <Textarea
          id={id}
          value={currentValue || ""} // Use currentValue
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px]"
        />
      )}

      {type === "number" && (
        <Input
          id={id}
          type="number"
          value={currentValue !== undefined ? currentValue : ""} // Use currentValue
          onChange={(e) => {
            // Handle potential empty string or invalid number input
            const val = e.target.value;
            if (val === "") {
              handleChange(undefined); // Treat empty string as clearing the value
            } else {
              const num = Number(val);
              // Only call handleChange if it's a valid number
              if (!isNaN(num)) {
                handleChange(num);
              }
              // If not a valid number (e.g., '1.2.3'), do nothing, keep the last valid state
            }
          }}
          min={min}
          max={max}
          step={step}
        />
      )}

      {type === "slider" && (
        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">{min ?? ""}</span>
            <span className="text-sm font-medium">
              {/* Use currentValue */}
              {currentValue !== undefined
                ? currentValue
                : min !== undefined && max !== undefined
                  ? (min + max) / 2
                  : ""}
            </span>
            <span className="text-xs text-gray-500">{max ?? ""}</span>
          </div>
          <Slider
            id={id}
            // Use currentValue, provide default based on min/max if undefined
            value={[
              currentValue !== undefined
                ? currentValue
                : min !== undefined && max !== undefined
                  ? (min + max) / 2
                  : 0,
            ]}
            min={min}
            max={max}
            step={step}
            onValueChange={(vals) => handleChange(vals[0])}
            disabled={min === undefined || max === undefined} // Disable slider if min/max not provided
          />
        </div>
      )}

      {type === "select" && (
        <Select
          value={currentValue ?? ""} // Use currentValue, provide default empty string if undefined/null
          onValueChange={handleChange}
        >
          <SelectTrigger>
            {/* Display selected value or placeholder */}
            <SelectValue placeholder={placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === "claudia_project" && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              {currentValue
                ? claudiaProjects.find((project) => project === currentValue)
                : (placeholder || "Select a project...")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search project..." />
              <CommandList>
                <CommandEmpty>No project found.</CommandEmpty>
                <CommandGroup>
                  {claudiaProjects.map((project) => (
                    <CommandItem
                      key={project}
                      value={project}
                      onSelect={(val) => {
                        handleChange(val);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentValue === project ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {project}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {type === "claudia_tag" && (
        <Popover open={openTag} onOpenChange={setOpenTag}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openTag}
              disabled={!dependencyValue || availableTags.length === 0}
              className="w-full justify-between font-normal"
            >
              {currentValue
                ? availableTags.find((tag) => tag === currentValue)
                : !dependencyValue
                ? "Select a project first"
                : (placeholder || "Select a tag...")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tag..." />
              <CommandList>
                <CommandEmpty>No tag found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="_none_"
                    onSelect={() => {
                      handleChange("");
                      setOpenTag(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !currentValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    No tag
                  </CommandItem>
                  {availableTags.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={(val) => {
                        handleChange(val);
                        setOpenTag(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentValue === tag ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {type === "json" && (
        <>
          <Textarea
            id={id}
            value={
              typeof currentValue === "string"
                ? currentValue
                : (JSON.stringify(currentValue, null, 2) ?? "")
            } // Use currentValue
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder={placeholder || '{\n  "key": "value"\n}'}
            className={cn(
              "min-h-[120px] font-mono text-sm",
              jsonError &&
                "border-red-500 focus:border-red-500 focus-visible:ring-red-500", // Add error styling
            )}
          />
          <div className="flex w-full items-start justify-between gap-2 pt-1">
            {" "}
            {/* Use items-start */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFormatJson(currentValue ?? "")}
              // Disable if value is empty, not a string, or already has a JSON error
              disabled={
                !currentValue || typeof currentValue !== "string" || !!jsonError
              }
              className="mt-1" // Add margin top to align better with textarea
            >
              Format
            </Button>
            {jsonError && (
              <Alert
                variant="destructive"
                className="flex-grow px-3 py-1" // Adjusted styling
              >
                <div className="flex items-center gap-2">
                  {" "}
                  {/* Ensure icon and text are aligned */}
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{" "}
                  {/* Added flex-shrink-0 */}
                  <AlertDescription className="text-xs">
                    {jsonError}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ConfigFieldTool({
  id,
  label,
  description,
  agentId,
  className,
  toolId,
  value: externalValue, // Rename to avoid conflict
  setValue: externalSetValue, // Rename to avoid conflict
}: Pick<
  ConfigFieldProps,
  | "id"
  | "label"
  | "description"
  | "agentId"
  | "className"
  | "value"
  | "setValue"
> & { toolId: string }) {
  const store = useConfigStore();
  const actualAgentId = `${agentId}:selected-tools`;

  const isExternallyManaged = externalSetValue !== undefined;

  const defaults = (
    isExternallyManaged
      ? externalValue
      : store.configsByAgentId[actualAgentId]?.[toolId]
  ) as ConfigurableFieldMCPMetadata["default"] | undefined;

  if (!defaults) {
    return null;
  }

  const checked = defaults.tools?.some((t) => t === label);

  const handleCheckedChange = (checked: boolean) => {
    const newValue = checked
      ? {
          ...defaults,
          // Remove duplicates
          tools: Array.from(
            new Set<string>([...(defaults.tools || []), label]),
          ),
        }
      : {
          ...defaults,
          tools: defaults.tools?.filter((t) => t !== label),
        };

    if (isExternallyManaged) {
      externalSetValue(newValue);
      return;
    }

    store.updateConfig(actualAgentId, toolId, newValue);
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className="text-sm font-medium"
        >
          {_.startCase(label)}
        </Label>
        <Switch
          id={id}
          checked={checked} // Use currentValue
          onCheckedChange={handleCheckedChange}
        />
      </div>

      {description && (
        <p className="text-xs whitespace-pre-line text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}

export function ConfigFieldRAG({
  id,
  label,
  agentId,
  className,
  value: externalValue, // Rename to avoid conflict
  setValue: externalSetValue, // Rename to avoid conflict
}: Pick<
  ConfigFieldProps,
  "id" | "label" | "agentId" | "className" | "value" | "setValue"
>) {
  const { collections } = useRagContext();
  const store = useConfigStore();
  const actualAgentId = `${agentId}:rag`;
  const [open, setOpen] = useState(false);

  const isExternallyManaged = externalSetValue !== undefined;

  const defaults = (
    isExternallyManaged
      ? externalValue
      : store.configsByAgentId[actualAgentId]?.[label]
  ) as ConfigurableFieldRAGMetadata["default"];

  if (!defaults) {
    return null;
  }

  const selectedCollections = defaults.collections?.length
    ? defaults.collections
    : [];

  const handleSelect = (collectionId: string) => {
    const newValue = selectedCollections.some((s) => s === collectionId)
      ? selectedCollections.filter((s) => s !== collectionId)
      : [...selectedCollections, collectionId];

    if (isExternallyManaged) {
      externalSetValue({
        ...defaults,
        collections: Array.from(new Set(newValue)),
      });
      return;
    }

    store.updateConfig(actualAgentId, label, {
      ...defaults,
      collections: Array.from(new Set(newValue)),
    });
  };

  const getCollectionNameFromId = (collectionId: string) => {
    const collection = collections.find((c) => c.uuid === collectionId);
    return collection?.name ?? "Unknown Collection";
  };

  return (
    <div className={cn("flex w-full flex-col items-start gap-2", className)}>
      <Label
        htmlFor={id}
        className="text-sm font-medium"
      >
        Selected Collections
      </Label>
      <Popover
        open={open}
        onOpenChange={setOpen}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCollections.length > 0
              ? selectedCollections.length > 1
                ? `${selectedCollections.length} collections selected`
                : getCollectionNameFromId(selectedCollections[0])
              : "Select collections"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          align="start"
        >
          <Command className="w-full">
            <CommandInput placeholder="Search collections..." />
            <CommandList>
              <CommandEmpty>No collections found.</CommandEmpty>
              <CommandGroup>
                {collections.map((collection) => (
                  <CommandItem
                    key={collection.uuid}
                    value={collection.uuid}
                    onSelect={() => handleSelect(collection.uuid)}
                    className="flex items-center justify-between"
                  >
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedCollections.includes(collection.uuid)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <p className="line-clamp-1 flex-1 truncate pr-2">
                      {collection.name}
                    </p>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ConfigFieldAgents({
  label,
  agentId,
  className,
  value: externalValue,
  setValue: externalSetValue,
  selectedProject,
}: Pick<
  ConfigFieldProps,
  | "id"
  | "label"
  | "description"
  | "agentId"
  | "className"
  | "value"
  | "setValue"
> & {
  selectedProject?: string;
}) {
  const store = useConfigStore();
  const actualAgentId = `${agentId}:agents`;

  const { agents, loading } = useAgentsContext();
  const deployments = getDeployments();

  // Do not allow adding itself as a sub-agent.
  // If a project is selected, only show agents from that project.
  const filteredAgents = agents.filter((a) => {
    if (a.assistant_id === agentId) return false;
    if (selectedProject) {
      const agentProjectName =
        (a.config?.configurable as Record<string, any>)?.project_name ?? undefined;
      return agentProjectName === selectedProject;
    }
    return true;
  });

  const isExternallyManaged = externalSetValue !== undefined;

  const defaults = (
    isExternallyManaged
      ? externalValue
      : store.configsByAgentId[actualAgentId]?.[label]
  ) as ConfigurableFieldAgentsMetadata["default"] | undefined;

  if (!defaults) {
    return null;
  }

  const handleSelectChange = (ids: string[]) => {
    if (!ids.length || ids.every((id) => !id)) {
      if (isExternallyManaged) {
        externalSetValue([]);
        return;
      }

      store.updateConfig(actualAgentId, label, []);
      return;
    }

    const newDefaults = ids.map((id) => {
      const [agent_id, deploymentId] = id.split(":");
      const deployment_url = deployments.find(
        (d) => d.id === deploymentId,
      )?.deploymentUrl;
      if (!deployment_url) {
        toast.error("Deployment not found");
      }

      // Preserve project_name and tag from existing defaults or resolve from agent metadata
      const existing = defaults?.find((d) => d.agent_id === agent_id);
      return {
        agent_id,
        deployment_url,
        name: agents.find((a) => a.assistant_id === agent_id)?.name,
        description: agents.find((a) => a.assistant_id === agent_id)?.metadata
          ?.description as string | undefined,
        project_name:
          existing?.project_name ??
          (agents.find((a) => a.assistant_id === agent_id)?.config
            ?.configurable as Record<string, any>)?.project_name,
        tag:
          existing?.tag ??
          (agents.find((a) => a.assistant_id === agent_id)?.config
            ?.configurable as Record<string, any>)?.tag,
      };
    });

    if (isExternallyManaged) {
      externalSetValue(newDefaults);
      return;
    }

    store.updateConfig(actualAgentId, label, newDefaults);
  };

  const handleTagChange = (agentId: string, tag: string) => {
    const newDefaults = (defaults ?? []).map((d) =>
      d.agent_id === agentId ? { ...d, tag: tag || undefined } : d,
    );
    if (isExternallyManaged) {
      externalSetValue(newDefaults);
      return;
    }
    store.updateConfig(actualAgentId, label, newDefaults);
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <AgentsCombobox
        agents={filteredAgents}
        agentsLoading={loading}
        value={defaults.map(
          (defaultValue) =>
            `${defaultValue.agent_id}:${deployments.find((d) => d.deploymentUrl === defaultValue.deployment_url)?.id}`,
        )}
        setValue={(v) =>
          Array.isArray(v) ? handleSelectChange(v) : handleSelectChange([v])
        }
        multiple
        className="w-full"
      />

      <p className="text-xs text-gray-500">
        The agents to make available to this supervisor.
      </p>
    </div>
  );
}
