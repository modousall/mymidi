
"use client";

import * as React from "react"
import { Building, Check, ChevronsUpDown, User, Phone, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useContacts } from "@/hooks/use-contacts";
import { useUserManagement } from "@/hooks/use-user-management";


type AliasSelectorProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    filter?: 'merchant' | 'user' | 'all'
}

export function AliasSelector({ value, onChange, disabled = false, filter = 'all' }: AliasSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const { contacts } = useContacts();
  const { users, refreshUsers } = useUserManagement();

  React.useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);


  const suggestions = React.useMemo(() => {
    const contactSuggestions = contacts.map(c => ({
        value: c.alias,
        label: `${c.name} (Contact)`,
        search: `${c.name} ${c.alias}`,
        type: 'contact' as const
    }));

    const merchantSuggestions = (users || [])
        .filter(u => u.role === 'merchant')
        .map(u => {
            const publicIdentifier = u.merchantCode || u.alias;
            return {
                value: publicIdentifier!,
                label: `${u.name} (Marchand)`,
                search: `${u.name} ${publicIdentifier}`,
                type: 'merchant' as const
            }
    });
    
    // In user mode, we only show contacts. In merchant filter mode, we show merchants.
    const allSuggestions = filter === 'merchant' ? merchantSuggestions : [...contactSuggestions, ...merchantSuggestions];

    const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) =>
        index === self.findIndex((s) => s.value === suggestion.value)
    );

    return uniqueSuggestions;

  }, [users, contacts, filter]);

  const getIcon = (type: 'contact' | 'user' | 'merchant') => {
      if (type === 'merchant') return <Building className="mr-2 h-4 w-4 text-muted-foreground"/>;
      if (type === 'contact') return <User className="mr-2 h-4 w-4 text-muted-foreground"/>;
      return <User className="mr-2 h-4 w-4 text-muted-foreground"/>;
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || users.length === 0}
        >
          {users.length === 0 ? (
            <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Chargement...</div>
          ) : (
            value
            ? suggestions.find((s) => s.value === value)?.label || value
            : "Sélectionnez ou saisissez..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Saisir un numéro ou rechercher..." 
            onValueChange={(search) => {
                const searchLower = search.toLowerCase();
                const found = suggestions.some(s => s.search.toLowerCase().includes(searchLower));
                if (!found) {
                    onChange(search);
                }
            }}
          />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.value}
                  value={suggestion.search}
                  onSelect={() => {
                    onChange(suggestion.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === suggestion.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                   {getIcon(suggestion.type)}
                  {suggestion.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
